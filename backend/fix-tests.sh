#!/bin/bash

# Fix RegisterSession - remove sessionNumber, add businessDate
find test/negative -name "*.spec.ts" -exec sed -i "/sessionNumber:/d" {} \;

# Add taxRate to all SalesOrder creates
find test/negative -name "*.spec.ts" -exec sed -i "/sessionId: 'test-session',/a\        businessDate: new Date()," {} \;

# Fix serviceCharge to serviceChargeAmount
find test/negative -name "*.spec.ts" -exec sed -i "s/serviceCharge:/serviceChargeAmount:/g" {} \;
find test/negative -name "*.spec.ts" -exec sed -i "s/serviceChargeRate:/serviceChargeRate:/g" {} \;

# Fix deliveryFee to deliveryCharge
find test/negative -name "*.spec.ts" -exec sed -i "s/deliveryFee:/deliveryCharge:/g" {} \;

# Fix closingBalance to actualClosingBalance
find test/negative -name "*.spec.ts" -exec sed -i "s/closingBalance:/actualClosingBalance:/g" {} \;
find test/negative -name "*.spec.ts" -exec sed -i "s/openingBalance:/openingBalance:/g" {} \;

# Fix expectedClosingBalance to expectedCash
find test/negative -name "*.spec.ts" -exec sed -i "s/expectedClosingBalance/expectedCash/g" {} \;

