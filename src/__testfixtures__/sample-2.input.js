test.serial('getPartnerVessels no vessels (SQL TEST)', async (t) => {
  const groupUuid = '11111111-1111-1111-1111-111111111111';
  const runner = (query, step) => {
    switch (step) {
      case 1: {
        t.is(query.method, 'select');
        t.is(
          query.sql,
          'select `vessels`.* from `vessels` inner join `groups` as `g` on `vessels`.`group_id` = `g`.`id` inner join `items` as `i` on `vessels`.`id` = `i`.`vessel_id` left join `items` as `i_corr` on `i`.`corresponding_item_uuid` = `i_corr`.`uuid` where `g`.`uuid` = ? and `i`.`type` = ? and `i`.`status` = ? and (`i_corr`.`id` is null or (`i_corr`.`type` = ? and `i_corr`.`status` in (?, ?)))',
        );
        t.is(query.bindings[0], groupUuid);
        t.is(query.bindings[1], orderType.delivery);
        t.is(query.bindings[2], orderState.accomplished);
        t.is(query.bindings[3], orderType.retrieval);
        t.is(query.bindings[4], orderState.open);
        t.is(query.bindings[5], orderState.accepted);
        return query.response([]);
      }

      default: {
        query.reject();
        return t.fail();
      }
    }
  };

  t.context.tracker.on('query', runner);
  const vesselsJSON = await addVesselStatus([], groupUuid);
  t.deepEqual(vesselsJSON, []);
});
