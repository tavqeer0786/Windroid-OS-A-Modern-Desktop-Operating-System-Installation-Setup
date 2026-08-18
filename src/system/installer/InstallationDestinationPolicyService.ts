import { InstallationSession } from './InstallerTypes';
import {
  InstallationDestinationContext,
  InstallationDestinationOption,
  InstallationDestinationPolicy,
  DEFAULT_APPLICATIONS_DISPLAY_PATH,
  DROIDBRIDGE_MANAGED_DISPLAY_PATH,
} from './InstallationDestinationTypes';
import {
  InstallationDestinationValidator,
  normalizePath,
} from './InstallationDestinationValidator';

export class InstallationDestinationPolicyService {
  private static instance: InstallationDestinationPolicyService;

  public static getInstance(): InstallationDestinationPolicyService {
    if (!InstallationDestinationPolicyService.instance) {
      InstallationDestinationPolicyService.instance =
        new InstallationDestinationPolicyService();
    }
    return InstallationDestinationPolicyService.instance;
  }

  public createPolicy(
    session: InstallationSession,
    context?: InstallationDestinationContext
  ): InstallationDestinationPolicy {
    const pkgKind = session.packageKind;
    const runtime = session.runtime;
    const isStore = session.launchMode === 'store-install';
    const cleanAppName =
      session.packageInfo?.displayName?.replace(/[^a-zA-Z0-9]/g, '') ||
      'Application';

    let options: InstallationDestinationOption[] = [];
    let defaultSelectedId = '';

    if (pkgKind === 'android-apk') {
      defaultSelectedId = 'opt_droidbridge_managed';
      options = [
        {
          id: 'opt_droidbridge_managed',
          kind: 'droidbridge-managed',
          title: 'DroidBridge Android Environment',
          description: 'Managed by Windroid OS',
          displayPath: DROIDBRIDGE_MANAGED_DISPLAY_PATH,
          resolvedPath: `/var/lib/windroid/droidbridge/apps/${cleanAppName}`,
          recommended: true,
          selected: true,
          customLocationAllowed: false,
          requiresElevation: false,
          managedByRuntime: true,
          available: true,
        },
      ];
    } else if (
      pkgKind === 'flatpak-bundle' ||
      pkgKind === 'flatpak-reference'
    ) {
      // Determine if user or system scope was previously recorded in session
      const existingPolicy = session.destination?.policy;
      defaultSelectedId =
        existingPolicy === 'system' ? 'opt_flatpak_system' : 'opt_flatpak_user';

      options = [
        {
          id: 'opt_flatpak_user',
          kind: 'flatpak-user',
          title: 'Current user',
          description: 'Installed in user home space (~/.local/share/flatpak)',
          displayPath: '~/.local/share/flatpak',
          resolvedPath: context?.userHomePath
            ? `${context.userHomePath}/.local/share/flatpak`
            : '/home/windroid/.local/share/flatpak',
          recommended: true,
          selected: defaultSelectedId === 'opt_flatpak_user',
          customLocationAllowed: false,
          requiresElevation: false,
          managedByRuntime: true,
          available: true,
        },
        {
          id: 'opt_flatpak_system',
          kind: 'flatpak-system',
          title: 'System-wide',
          description:
            'Available for all users on this system (may require administrator approval)',
          displayPath: '/var/lib/flatpak',
          resolvedPath: '/var/lib/flatpak',
          recommended: false,
          selected: defaultSelectedId === 'opt_flatpak_system',
          customLocationAllowed: false,
          requiresElevation: true,
          managedByRuntime: true,
          available: context?.supportsSystemScope ?? true,
        },
      ];
    } else {
      // Windows packages (.exe, .msi) or fallback
      const existingCustom = session.destination?.policy === 'custom';
      defaultSelectedId = existingCustom ? 'opt_app_custom' : 'opt_app_default';

      const customPath =
        existingCustom && session.destination?.path
          ? session.destination.path
          : context?.selectedCustomPath || `/WindroidOS/CustomApps/${cleanAppName}`;

      options = [
        {
          id: 'opt_app_default',
          kind: 'applications-default',
          title: 'Applications (Default)',
          description: 'Standard system applications directory',
          displayPath: DEFAULT_APPLICATIONS_DISPLAY_PATH,
          resolvedPath: `/var/lib/windroid/winbridge/prefixes/${cleanAppName.toLowerCase()}`,
          recommended: true,
          selected: !existingCustom,
          customLocationAllowed: true,
          requiresElevation: false,
          managedByRuntime: false,
          available: true,
        },
        {
          id: 'opt_app_custom',
          kind: 'custom-folder',
          title: 'Custom Folder',
          description: 'Choose a custom location to install',
          displayPath: customPath,
          resolvedPath: customPath,
          recommended: false,
          selected: existingCustom,
          customLocationAllowed: true,
          requiresElevation: false,
          managedByRuntime: false,
          available: context?.supportsCustomFolder ?? true,
        },
      ];
    }

    const selectedOption =
      options.find((o) => o.id === defaultSelectedId) || options[0];
    const initialCustomPath =
      options.find((o) => o.kind === 'custom-folder')?.displayPath ||
      context?.selectedCustomPath ||
      `/WindroidOS/CustomApps/${cleanAppName}`;

    const rawPolicy: InstallationDestinationPolicy = {
      packageKind: pkgKind,
      runtime: runtime,
      availableOptions: options.map((o) => ({
        ...o,
        selected: o.id === selectedOption.id,
      })),
      selectedOptionId: selectedOption.id,
      customPath: initialCustomPath,
      validation: { valid: true, writable: true, enoughSpace: true, exists: true },
      source: isStore ? 'store-policy' : 'default-policy',
      resolvedAt: Date.now(),
    };

    return InstallationDestinationValidator.validatePolicy(rawPolicy, context);
  }

  public selectOption(
    policy: InstallationDestinationPolicy,
    optionId: string,
    context?: InstallationDestinationContext
  ): InstallationDestinationPolicy {
    if (policy.selectedOptionId === optionId) {
      return policy;
    }

    const targetOpt = policy.availableOptions.find((o) => o.id === optionId);
    if (!targetOpt || !targetOpt.available) {
      return policy;
    }

    const updatedOptions = policy.availableOptions.map((o) => ({
      ...o,
      selected: o.id === optionId,
    }));

    const nextPolicy: InstallationDestinationPolicy = {
      ...policy,
      availableOptions: updatedOptions,
      selectedOptionId: optionId,
      resolvedAt: Date.now(),
    };

    return InstallationDestinationValidator.validatePolicy(nextPolicy, context);
  }

  public setCustomPath(
    policy: InstallationDestinationPolicy,
    path: string,
    context?: InstallationDestinationContext
  ): InstallationDestinationPolicy {
    if (
      policy.packageKind === 'android-apk' ||
      policy.packageKind === 'flatpak-bundle' ||
      policy.packageKind === 'flatpak-reference'
    ) {
      return policy;
    }

    const normalized = normalizePath(path);
    if (policy.customPath === normalized) {
      return policy;
    }

    const updatedOptions = policy.availableOptions.map((o) => {
      if (o.kind === 'custom-folder') {
        return {
          ...o,
          displayPath: normalized,
          resolvedPath: normalized,
        };
      }
      return o;
    });

    const nextPolicy: InstallationDestinationPolicy = {
      ...policy,
      availableOptions: updatedOptions,
      customPath: normalized,
      resolvedAt: Date.now(),
    };

    return InstallationDestinationValidator.validatePolicy(nextPolicy, context);
  }

  public validate(
    policy: InstallationDestinationPolicy,
    context?: InstallationDestinationContext
  ): InstallationDestinationPolicy {
    return InstallationDestinationValidator.validatePolicy(policy, context);
  }

  public getSelectedOption(
    policy: InstallationDestinationPolicy
  ): InstallationDestinationOption | undefined {
    return policy.availableOptions.find((o) => o.id === policy.selectedOptionId);
  }
}
