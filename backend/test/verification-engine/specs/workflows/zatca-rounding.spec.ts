import Decimal from 'decimal.js';
import { DecimalUtils } from '../../../../src/common/utils/decimal.utils';

describe('workflow: zatca rounding', () => {
  it('rounds using HALF_UP at document level', () => {
    const value = new Decimal('1.005');
    const rounded = DecimalUtils.roundMoney(value);
    expect(rounded.toString()).toBe('1.01');
  });
});
