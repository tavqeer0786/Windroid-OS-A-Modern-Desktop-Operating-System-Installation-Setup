import { PackageDetectionService } from './PackageDetectionService';

export function runPackageDetectionTests() {
  const tests = [
    {
      input: 'SampleApp.exe',
      expected: { supported: true, packageKind: 'windows-exe', runtime: 'winbridge' },
    },
    {
      input: 'Setup.MSI',
      expected: { supported: true, packageKind: 'windows-msi', runtime: 'winbridge' },
    },
    {
      input: 'SocialApp.apk',
      expected: { supported: true, packageKind: 'android-apk', runtime: 'droidbridge' },
    },
    {
      input: 'NativeTool.flatpak',
      expected: { supported: true, packageKind: 'flatpak-bundle', runtime: 'native-flatpak' },
    },
    {
      input: 'NativeTool.flatpakref',
      expected: { supported: true, packageKind: 'flatpak-reference', runtime: 'native-flatpak' },
    },
    {
      input: 'ArchivePackage.zip',
      expected: { supported: false, unsupportedCategory: 'archive' },
    },
    {
      input: 'Backup.rar',
      expected: { supported: false, unsupportedCategory: 'archive' },
    },
    {
      input: 'DataStore.7z',
      expected: { supported: false, unsupportedCategory: 'archive' },
    },
    {
      input: 'DiskImage.iso',
      expected: { supported: false, unsupportedCategory: 'disk-image' },
    },
    {
      input: 'archive.tar.gz',
      expected: { supported: false, unsupportedCategory: 'archive' },
    },
    {
      input: 'archive.tar.xz',
      expected: { supported: false, unsupportedCategory: 'archive' },
    },
    {
      input: 'package.deb',
      expected: { supported: false, unsupportedCategory: 'unsupported-linux-package' },
    },
    {
      input: 'package.rpm',
      expected: { supported: false, unsupportedCategory: 'unsupported-linux-package' },
    },
    {
      input: 'portable.AppImage',
      expected: { supported: false, unsupportedCategory: 'unsupported-linux-package' },
    },
    {
      input: 'README',
      expected: { supported: false, unsupportedCategory: 'unknown' },
    },
    {
      input: '.hiddenfile',
      expected: { supported: false, unsupportedCategory: 'unknown' },
    },
    {
      input: 'ChromeSetup.EXE?download=1',
      expected: { supported: true, packageKind: 'windows-exe', runtime: 'winbridge' },
    },
    {
      input: 'C:\\Users\\User\\Downloads\\Setup.msi',
      expected: { supported: true, packageKind: 'windows-msi', runtime: 'winbridge' },
    },
    {
      input: '/home/user/Downloads/SocialApp.apk',
      expected: { supported: true, packageKind: 'android-apk', runtime: 'droidbridge' },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    const res = PackageDetectionService.detectFromPath(t.input);
    let ok = true;

    if (res.supported !== t.expected.supported) ok = false;
    if ('packageKind' in t.expected && res.packageKind !== t.expected.packageKind) ok = false;
    if ('runtime' in t.expected && res.runtime !== t.expected.runtime) ok = false;
    if ('unsupportedCategory' in t.expected && res.unsupportedCategory !== t.expected.unsupportedCategory) ok = false;

    if (ok) {
      passed++;
    } else {
      failed++;
      console.error(`[FAIL] Input: ${t.input}`, res, 'Expected:', t.expected);
    }
  }

  return { passed, failed, total: tests.length };
}
