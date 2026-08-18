import { PowerAction, PowerStatus } from '../types/hardware';
import { WindroidSystemBridge } from './WindroidSystemBridge';

export class PowerService {
  private static instance: PowerService;

  private constructor() {}

  public static getInstance(): PowerService {
    if (!PowerService.instance) {
      PowerService.instance = new PowerService();
    }
    return PowerService.instance;
  }

  public async getPowerStatus(): Promise<PowerStatus> {
    const bridge = WindroidSystemBridge.getInstance();
    return bridge.getPowerStatus();
  }

  public async executePowerAction(action: PowerAction): Promise<{ success: boolean; error?: string }> {
    const bridge = WindroidSystemBridge.getInstance();
    return bridge.executePowerAction(action);
  }

  public async setBatterySaver(enabled: boolean): Promise<{ success: boolean; batterySaverActive: boolean }> {
    const bridge = WindroidSystemBridge.getInstance();
    return bridge.setBatterySaver(enabled);
  }
}
