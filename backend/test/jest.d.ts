declare namespace jest {
  interface Matchers<R> {
    toBeDecimal(): R;
    toEqualDecimal(expected: string | number): R;
    toBeGreaterThanDecimal(expected: string | number): R;
  }
}
