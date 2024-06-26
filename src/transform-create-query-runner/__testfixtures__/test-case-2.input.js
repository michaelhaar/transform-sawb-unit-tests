import { getAddresses } from 'controllers/Addresses/getAddresses';
import { mockHelper, createQueryRunner } from 'test/helper';
import mockKnex from 'mock-knex';
import test from 'ava';

test.beforeEach((t) => {
  t.context.tracker = mockKnex.getTracker();
  t.context.tracker.install();
});

test.afterEach.always((t) => {
  t.context.tracker.uninstall();
});

test.serial('getAddresses: should not return addresses, when not logged in', async (t) => {
  const req = {
    swagger: {
      params: {
        lat: { value: 15 },
        long: { value: 16 },
      },
    },
  };
  await t.notThrows(() => {
    getAddresses({ req });
  });
});

test.serial('getAddresses: should return addresses, when logged in', async (t) => {
  const runner = createQueryRunner(t, [
    (query) =>
      // select users
      query.response([
        {
          id: 1,
          first_name: 'Seppl',
          last_name: 'Huaba',
        },
      ]),
    (query) =>
      // select addresses
      query.response([
        {
          id: 20,
          address: 'Hans-Roth-Straße',
          building_number: 1,
          postal: '8073',
          city: 'Feldkirchen bei Graz',
          _pivot_user_id: 1,
        },
        {
          id: 26,
          address: 'Stracke Creek',
          building_number: 30,
          postal: '8705',
          city: 'Rohanside',
          _pivot_user_id: 1,
        },
        {
          id: 31,
          address: 'Cummings Light',
          building_number: 39,
          postal: '8668',
          city: 'Lake Margot',
          _pivot_user_id: 1,
        },
      ]),
    (query) => {
      t.is(
        query.sql,
        'select distinct `address_documents`.* from `address_documents` where `deleted` = ? and `address_documents`.`address_id` in (?, ?, ?)',
      );
      t.is(query.method, 'select');
      t.deepEqual(query.bindings, [0, 20, 26, 31]);
      return query.response([]);
    },
  ]);

  t.context.tracker.on('query', runner);

  const req = {
    swagger: {
      params: {
        lat: { value: 15 },
        long: { value: 16 },
      },
    },
  };
  const { user } = mockHelper({
    user: {
      id: 1,
      first_name: 'Seppl',
      last_name: 'Huaba',
    },
  });

  const result = await getAddresses({ req, user });
  t.is(result.user.get('id'), 1);
  t.is(result.req.swagger.params.lat.value, 15);
  t.is(result.addresses.length, 3);
  t.is(result.addresses.at(0).get('address'), 'Hans-Roth-Straße');
});
