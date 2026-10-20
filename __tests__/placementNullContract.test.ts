import { Purchases } from '../src/index';

// Unit boundary regression. The actual iOS helper + Capacitor serializer emit undefined
// for a nil offering. Separate native-app evidence establishes reachability without mocks.
const nativePlacement = jest.fn();
const nativeVoid = jest.fn(() => Promise.resolve(undefined));
jest.mock('@capacitor/core', () => ({
  registerPlugin: () => ({
    getCurrentOfferingForPlacement: (...args: unknown[]) => nativePlacement(...args),
    invalidateCustomerInfoCache: () => nativeVoid(),
  }),
}));

beforeEach(() => jest.clearAllMocks());
it('maps the native absent offering to the documented null', async () => {
  nativePlacement.mockResolvedValueOnce(undefined);
  await expect(Purchases.getCurrentOfferingForPlacement({ placementIdentifier: 'none' })).resolves.toBeNull();
});
it('supports a consumer that checks only the documented null', async () => {
  nativePlacement.mockResolvedValueOnce(undefined);
  const offering = await Purchases.getCurrentOfferingForPlacement({ placementIdentifier: 'none' });
  expect(() => (offering !== null ? offering.identifier : 'No offering')).not.toThrow();
});
it('preserves an existing offering and forwards the placement identifier', async () => {
  const offering = { identifier: 'control' };
  nativePlacement.mockResolvedValueOnce(offering);
  await expect(Purchases.getCurrentOfferingForPlacement({ placementIdentifier: 'control' })).resolves.toBe(offering);
  expect(nativePlacement).toHaveBeenCalledWith({ placementIdentifier: 'control' });
});
it('preserves an explicit null', async () => {
  nativePlacement.mockResolvedValueOnce(null);
  await expect(Purchases.getCurrentOfferingForPlacement({ placementIdentifier: 'none' })).resolves.toBeNull();
});
it('keeps errors as rejections', async () => {
  const error = new Error('failure');
  nativePlacement.mockRejectedValueOnce(error);
  await expect(Purchases.getCurrentOfferingForPlacement({ placementIdentifier: 'none' })).rejects.toBe(error);
});
it('does not change unrelated void results', async () => {
  await expect(Purchases.invalidateCustomerInfoCache()).resolves.toBeUndefined();
});
