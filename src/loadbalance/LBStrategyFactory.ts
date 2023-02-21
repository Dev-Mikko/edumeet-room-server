import { Logger } from 'edumeet-common';
import { GeoStrategy } from './GeoStrategy';
import { LBStrategy, LB_STRATEGIES } from './LBStrategy';
import { StickyStrategy } from './StickyStrategy';

const logger = new Logger('LBStrategyFactory');

export class LBStrategyFactory {
	private strategies: string[];

	constructor(strategies: string[]) {
		if (!this.areValid(strategies)) {
			throw Error('Invalid load balancing strategies');
		}
		this.strategies = strategies;
	}

	private areValid(strategies: string[]): boolean {
		logger.debug('validating strategies', strategies);
		
		return strategies.every((strategy) => 
			strategy == LB_STRATEGIES.GEO ||
            strategy == LB_STRATEGIES.STICKY
		);
	}

	public createStickyStrategy() {
		return new StickyStrategy();
	}

	public createStrategies() {
		const strategies = new Map<string, LBStrategy>();

		if (this.strategies.includes(LB_STRATEGIES.GEO)) {
			logger.debug('creating', LB_STRATEGIES.GEO, 'strategy');
			strategies.set(LB_STRATEGIES.GEO, new GeoStrategy());
		}
		
		return strategies;
	}
}