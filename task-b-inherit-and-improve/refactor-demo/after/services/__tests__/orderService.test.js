// services/__tests__/orderService.test.js
//
// This test is the point of the refactor made concrete: it exercises the
// real business logic - status validation, pricing, the not-found path -
// with zero network calls, zero real database, and zero real email
// provider. In the "before" version this was impossible to test without
// spinning up MySQL and mocking the entire `mysql2` driver at the module
// level; here it's a plain function call against a fake repository.

const { makeOrderService, NotFoundError, ValidationError } = require('../orderService');

function fakeRepository(initialOrder) {
  const state = { ...initialOrder };
  return {
    async findById(id) {
      return id === state.id ? { ...state } : null;
    },
    async updateStatusAndTotal(id, status, total) {
      state.status = status;
      state.total = total;
    },
    _state: state,
  };
}

describe('orderService.updateStatus', () => {
  test('rejects an unknown status without touching the repository', async () => {
    const repo = fakeRepository({ id: 'o1', subtotal: 100, customer_type: 'standard', item_count: 2 });
    const service = makeOrderService(repo);

    await expect(service.updateStatus('o1', 'not_a_real_status')).rejects.toBeInstanceOf(ValidationError);
  });

  test('throws NotFoundError for an order that does not exist', async () => {
    const repo = fakeRepository({ id: 'o1', subtotal: 100, customer_type: 'standard', item_count: 2 });
    const service = makeOrderService(repo);

    await expect(service.updateStatus('does-not-exist', 'shipped')).rejects.toBeInstanceOf(NotFoundError);
  });

  test('applies the VIP discount and free-shipping rule from the shared pricing service', async () => {
    const repo = fakeRepository({ id: 'o1', subtotal: 40, customer_type: 'vip', item_count: 2 });
    const service = makeOrderService(repo);

    const result = await service.updateStatus('o1', 'processing');

    // 40 * 0.9 = 36, still under the $50 free-shipping threshold, so
    // shipping is added back: 36 + 4.99 = 40.99
    expect(result.total).toBeCloseTo(40.99);
    expect(repo._state.status).toBe('processing');
  });

  test('applies the bulk discount and skips shipping once the order clears $50', async () => {
    const repo = fakeRepository({ id: 'o2', subtotal: 80, customer_type: 'standard', item_count: 15 });
    const service = makeOrderService(repo);

    const result = await service.updateStatus('o2', 'shipped');

    // 80 - 5 (bulk) = 75, already over $50, no shipping added
    expect(result.total).toBeCloseTo(75);
  });
});
