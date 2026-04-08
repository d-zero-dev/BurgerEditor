import type { RatioValue } from '@d-zero/shared/ratio-value';

import { updateRatio } from '@d-zero/shared/ratio-value';

/**
 *
 */
export function createWidthState() {
	const MIN_NUMBER = 1;

	let _widthState: RatioValue = {
		absNumber: 100,
		maxAbsNumber: 100,
		relNumber: 1,
		maxRelNumber: 1,
	};

	let _unit: 'px' | 'cqi' = 'px';

	return {
		setScaleType(type: 'container' | 'original') {
			_unit = type === 'container' ? 'cqi' : 'px';
		},
		setNumber(number: number) {
			switch (_unit) {
				case 'px': {
					this.setAbsNumber(number);
					return;
				}
				case 'cqi': {
					this.setScale(number);
					return;
				}
			}
		},
		setAbsNumber(number: number) {
			number = Math.max(MIN_NUMBER, number);
			_widthState = updateRatio(_widthState, 'absNumber', number);
		},
		setScale(scale: number) {
			scale = Math.min(Math.max(MIN_NUMBER, scale), 100);
			_widthState = updateRatio(_widthState, 'relNumber', scale / 100);
		},
		setMaxNumber(number: number) {
			number = Math.max(MIN_NUMBER, number);
			_widthState = updateRatio(_widthState, 'maxAbsNumber', number);
		},
		getCSSWidth(): `${number}${'px' | 'cqi'}` {
			const num = this.getCSSWidthNumber();
			return `${num}${_unit}`;
		},
		getCSSWidthNumber(): number {
			return _unit === 'px' ? this.getAbsNumber() : this.getScale();
		},
		getCSSWidthMaxNumber(): number {
			return this.getScaleType() === 'original' ? this.getMaxNumber() : 100;
		},
		getCSSWidthUnit(): 'px' | 'cqi' {
			return _unit;
		},
		getScaleType(): 'container' | 'original' {
			return _unit === 'cqi' ? 'container' : 'original';
		},
		getAbsNumber(): number {
			return Math.min(
				Math.max(MIN_NUMBER, Math.round(_widthState.absNumber)),
				_widthState.maxAbsNumber,
			);
		},
		getMaxNumber(): number {
			return _widthState.maxAbsNumber;
		},
		getScale(): number {
			return Math.round(_widthState.relNumber * 100);
		},
		debug() {
			return {
				..._widthState,
				unit: _unit,
				css: this.getCSSWidth(),
			};
		},
	};
}
