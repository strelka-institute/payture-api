import test from 'ava'
import nanoid from 'nanoid'
import createPaytureApi from '../src'

const api = createPaytureApi()
const PAID_ORDER_ID = 'WqNl4LDHnv5250Ng8zaTQ'

test('API Init', async (t) => {
  const OrderId = nanoid()

  const res = await api.init({
    OrderId: OrderId,
    Amount: 50000,
    Product: 'ticket',
    Description: 'MyTestTransaction',
    Language: 'EN'
  })

  t.is(res.OrderId, OrderId)
  t.true(res.RedirectUrl != null, OrderId)
  t.false(await api.status(OrderId))
})

test('API Cheque Init', async (t) => {
  const OrderId = nanoid()

  const res = await api.init({
    OrderId: OrderId,
    Amount: 50000,
    Product: 'ticket',
    Description: 'MyTestTransaction',
    Language: 'EN',
    Cheque: {
      Positions: [
        {
          Quantity: 1.000,
          Price: 50000,
          Tax: 6,
          Text: 'Test Good'
        }
      ],
      CheckClose: { TaxationSystem: 6 },
      Message: 'Test Cheque Message'
    }
  })

  t.is(res.OrderId, OrderId)
  t.true(res.RedirectUrl != null, OrderId)
  t.false(await api.status(OrderId))
})

test('API Status', async (t) => {
  t.true(await api.status(PAID_ORDER_ID))
})
