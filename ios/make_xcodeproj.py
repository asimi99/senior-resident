#!/usr/bin/env python3
"""Writes SeniorResident.xcodeproj without needing XcodeGen. Run from the ios folder: python3 make_xcodeproj.py"""
import hashlib, os, glob

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
objs = {}

def gid(*k):
    return hashlib.md5('|'.join(k).encode()).hexdigest()[:24].upper()

def q(v):
    s = str(v)
    if s and all(c.isalnum() or c in '._/' for c in s):
        return s
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'

def val(v, ind=2):
    pad = '\t' * ind
    if isinstance(v, dict):
        return '{\n' + ''.join(f'{pad}\t{q(k)} = {val(x, ind + 1)};\n' for k, x in v.items()) + pad + '}'
    if isinstance(v, list):
        return '(\n' + ''.join(f'{pad}\t{val(x, ind + 1)},\n' for x in v) + pad + ')'
    return q(v)

def add(i, d):
    objs[i] = d
    return i

TYPES = {'.swift': 'sourcecode.swift', '.xcassets': 'folder.assetcatalog', '.json': 'text.json', '.plist': 'text.plist.xml',
         '.entitlements': 'text.plist.entitlements', '.xcprivacy': 'text.xml', '.md': 'net.daringfireball.markdown'}

def fref(path):
    name = os.path.basename(path)
    return add(gid('file', path), {'isa': 'PBXFileReference', 'lastKnownFileType': TYPES[os.path.splitext(name)[1]], 'path': name, 'sourceTree': '<group>'})

def group(name, path, children):
    return add(gid('group', path or name), {'isa': 'PBXGroup', 'children': children, **({'path': path} if path else {'name': name}), 'sourceTree': '<group>'})

def files_in(folder):
    out = []
    for p in sorted(os.listdir(folder)):
        full = os.path.join(folder, p)
        if p.startswith('.'):
            continue
        if os.path.isdir(full) and not p.endswith('.xcassets'):
            out.append(('dir', full))
        else:
            out.append(('file', full))
    return out

def build_group(folder):
    children = []
    for kind, full in files_in(folder):
        if kind == 'dir':
            children.append(build_group(full))
        elif os.path.splitext(full)[1] in TYPES:
            children.append(fref(full))
    return group(os.path.basename(folder), os.path.basename(folder), children)

g_app, g_shared, g_widget = build_group('SeniorResident'), build_group('Shared'), build_group('Widget')
p_app = add(gid('product', 'app'), {'isa': 'PBXFileReference', 'explicitFileType': 'wrapper.application', 'includeInIndex': 0, 'path': 'SeniorResident.app', 'sourceTree': 'BUILT_PRODUCTS_DIR'})
p_wid = add(gid('product', 'widget'), {'isa': 'PBXFileReference', 'explicitFileType': 'wrapper.app-extension', 'includeInIndex': 0, 'path': 'SeniorResidentWidget.appex', 'sourceTree': 'BUILT_PRODUCTS_DIR'})
g_products = group('Products', None, [p_app, p_wid])
g_main = add(gid('group', 'main'), {'isa': 'PBXGroup', 'children': [g_app, g_shared, g_widget, g_products], 'sourceTree': '<group>'})

def bfile(target, path, **extra):
    return add(gid('build', target, path), {'isa': 'PBXBuildFile', 'fileRef': gid('file', path), **extra})

def collect(folders, exts):
    out = []
    for f in folders:
        for p in sorted(glob.glob(f + '/**/*', recursive=True)):
            if '.xcassets/' in p:
                continue
            if os.path.splitext(p)[1] in exts and (os.path.isfile(p) or p.endswith('.xcassets')):
                out.append(p)
    return out

app_src = [bfile('app', p) for p in collect(['SeniorResident', 'Shared'], ['.swift'])]
app_res = [bfile('app', p) for p in collect(['SeniorResident'], ['.xcassets', '.json', '.xcprivacy'])]
wid_src = [bfile('widget', p) for p in collect(['Widget', 'Shared'], ['.swift'])]
wid_res = [bfile('widget', p) for p in collect(['Widget'], ['.xcassets', '.xcprivacy'])]

pkg = add(gid('pkg', 'supabase'), {'isa': 'XCRemoteSwiftPackageReference', 'repositoryURL': 'https://github.com/supabase/supabase-swift',
                                    'requirement': {'kind': 'upToNextMajorVersion', 'minimumVersion': '2.20.0'}})
pkg_prod = add(gid('pkgprod', 'supabase'), {'isa': 'XCSwiftPackageProductDependency', 'package': pkg, 'productName': 'Supabase'})
pkg_build = add(gid('build', 'app', 'supabase'), {'isa': 'PBXBuildFile', 'productRef': pkg_prod})

def phase(kind, key, files, **extra):
    return add(gid('phase', key), {'isa': kind, 'buildActionMask': 2147483647, 'files': files, 'runOnlyForDeploymentPostprocessing': 0, **extra})

embed_file = add(gid('build', 'app', 'embed-widget'), {'isa': 'PBXBuildFile', 'fileRef': p_wid, 'settings': {'ATTRIBUTES': ['RemoveHeadersOnCopy']}})
ph_app = [phase('PBXSourcesBuildPhase', 'app-src', app_src), phase('PBXFrameworksBuildPhase', 'app-fw', [pkg_build]),
          phase('PBXResourcesBuildPhase', 'app-res', app_res),
          phase('PBXCopyFilesBuildPhase', 'app-embed', [embed_file], dstPath='', dstSubfolderSpec=13, name='Embed Foundation Extensions')]
ph_wid = [phase('PBXSourcesBuildPhase', 'wid-src', wid_src), phase('PBXFrameworksBuildPhase', 'wid-fw', []), phase('PBXResourcesBuildPhase', 'wid-res', wid_res)]

common = {'CODE_SIGN_STYLE': 'Automatic', 'CURRENT_PROJECT_VERSION': '1', 'MARKETING_VERSION': '1.0', 'DEVELOPMENT_TEAM': '',
          'SWIFT_VERSION': '5.0', 'TARGETED_DEVICE_FAMILY': '1,2', 'IPHONEOS_DEPLOYMENT_TARGET': '17.0', 'PRODUCT_NAME': '$(TARGET_NAME)',
          'SWIFT_EMIT_LOC_STRINGS': 'YES', 'GENERATE_INFOPLIST_FILE': 'NO'}
app_set = {**common, 'ASSETCATALOG_COMPILER_APPICON_NAME': 'AppIcon', 'ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME': 'AccentColor',
           'CODE_SIGN_ENTITLEMENTS': 'SeniorResident/SeniorResident.entitlements', 'INFOPLIST_FILE': 'SeniorResident/Info.plist',
           'LD_RUNPATH_SEARCH_PATHS': ['$(inherited)', '@executable_path/Frameworks'], 'PRODUCT_BUNDLE_IDENTIFIER': 'com.myseniorresident.app',
           'ENABLE_PREVIEWS': 'YES'}
wid_set = {**common, 'ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME': 'AccentColor', 'CODE_SIGN_ENTITLEMENTS': 'Widget/Widget.entitlements',
           'INFOPLIST_FILE': 'Widget/Info.plist', 'LD_RUNPATH_SEARCH_PATHS': ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks'],
           'PRODUCT_BUNDLE_IDENTIFIER': 'com.myseniorresident.app.widget', 'SKIP_INSTALL': 'YES'}
proj_base = {'ALWAYS_SEARCH_USER_PATHS': 'NO', 'CLANG_ENABLE_MODULES': 'YES', 'CLANG_ENABLE_OBJC_ARC': 'YES', 'COPY_PHASE_STRIP': 'NO',
             'ENABLE_STRICT_OBJC_MSGSEND': 'YES', 'ENABLE_USER_SCRIPT_SANDBOXING': 'YES', 'GCC_C_LANGUAGE_STANDARD': 'gnu17',
             'IPHONEOS_DEPLOYMENT_TARGET': '17.0', 'SDKROOT': 'iphoneos', 'LOCALIZATION_PREFERS_STRING_CATALOGS': 'YES'}
proj_dbg = {**proj_base, 'DEBUG_INFORMATION_FORMAT': 'dwarf', 'ENABLE_TESTABILITY': 'YES', 'GCC_OPTIMIZATION_LEVEL': '0', 'ONLY_ACTIVE_ARCH': 'YES',
            'SWIFT_ACTIVE_COMPILATION_CONDITIONS': 'DEBUG $(inherited)', 'SWIFT_OPTIMIZATION_LEVEL': '-Onone', 'MTL_ENABLE_DEBUG_INFO': 'INCLUDE_SOURCE'}
proj_rel = {**proj_base, 'DEBUG_INFORMATION_FORMAT': 'dwarf-with-dsym', 'ENABLE_NS_ASSERTIONS': 'NO', 'SWIFT_COMPILATION_MODE': 'wholemodule', 'VALIDATE_PRODUCT': 'YES'}

def conflist(key, dbg, rel):
    d = add(gid('cfg', key, 'Debug'), {'isa': 'XCBuildConfiguration', 'buildSettings': dbg, 'name': 'Debug'})
    r = add(gid('cfg', key, 'Release'), {'isa': 'XCBuildConfiguration', 'buildSettings': rel, 'name': 'Release'})
    return add(gid('cfglist', key), {'isa': 'XCConfigurationList', 'buildConfigurations': [d, r], 'defaultConfigurationIsVisible': 0, 'defaultConfigurationName': 'Release'})

root = gid('project')
t_wid = add(gid('target', 'widget'), {'isa': 'PBXNativeTarget', 'buildConfigurationList': conflist('widget', wid_set, wid_set), 'buildPhases': ph_wid,
        'buildRules': [], 'dependencies': [], 'name': 'SeniorResidentWidget', 'productName': 'SeniorResidentWidget',
        'productReference': p_wid, 'productType': 'com.apple.product-type.app-extension'})
proxy = add(gid('proxy', 'widget'), {'isa': 'PBXContainerItemProxy', 'containerPortal': root, 'proxyType': 1, 'remoteGlobalIDString': t_wid, 'remoteInfo': 'SeniorResidentWidget'})
dep = add(gid('dep', 'widget'), {'isa': 'PBXTargetDependency', 'target': t_wid, 'targetProxy': proxy})
t_app = add(gid('target', 'app'), {'isa': 'PBXNativeTarget', 'buildConfigurationList': conflist('app', app_set, app_set), 'buildPhases': ph_app,
        'buildRules': [], 'dependencies': [dep], 'name': 'SeniorResident', 'packageProductDependencies': [pkg_prod], 'productName': 'SeniorResident',
        'productReference': p_app, 'productType': 'com.apple.product-type.application'})
add(root, {'isa': 'PBXProject', 'attributes': {'BuildIndependentTargetsInParallel': 1, 'LastSwiftUpdateCheck': 1600, 'LastUpgradeCheck': 1600,
           'TargetAttributes': {t_app: {'CreatedOnToolsVersion': '16.0'}, t_wid: {'CreatedOnToolsVersion': '16.0'}}},
           'buildConfigurationList': conflist('project', proj_dbg, proj_rel), 'compatibilityVersion': 'Xcode 14.0', 'developmentRegion': 'en',
           'hasScannedForEncodings': 0, 'knownRegions': ['en', 'Base'], 'mainGroup': g_main, 'packageReferences': [pkg],
           'productRefGroup': g_products, 'projectDirPath': '', 'projectRoot': '', 'targets': [t_app, t_wid]})

out = '// !$*UTF8*$!\n{\n\tarchiveVersion = 1;\n\tclasses = {\n\t};\n\tobjectVersion = 60;\n\tobjects = {\n'
by_isa = {}
for k, v in objs.items():
    by_isa.setdefault(v['isa'], []).append((k, v))
for isa in sorted(by_isa):
    out += f'\n/* Begin {isa} section */\n'
    for k, v in sorted(by_isa[isa]):
        out += f'\t\t{k} = {val(v, 2)};\n'
    out += f'/* End {isa} section */\n'
out += f'\t}};\n\trootObject = {root};\n}}\n'
os.makedirs('SeniorResident.xcodeproj', exist_ok=True)
open('SeniorResident.xcodeproj/project.pbxproj', 'w').write(out)
print('wrote SeniorResident.xcodeproj', len(objs), 'objects')
