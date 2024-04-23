test.serial(
  'CREDIT-DOCUMENT: generate billingInformationDto for logistics with connected billing group (proforma)',
  async (t) => {
    const runner = createQueryRunner(t, [
      (query) => {
        t.is(
          query.sql,
          'select distinct `groups`.*, `connected_billing_groups`.`main_billing_group_id` as `_pivot_main_billing_group_id`, `connected_billing_groups`.`connected_billing_group_id` as `_pivot_connected_billing_group_id` from `groups` inner join `connected_billing_groups` on `connected_billing_groups`.`connected_billing_group_id` = `groups`.`id` where `connected_billing_groups`.`main_billing_group_id` in (?)',
        );
        t.deepEqual(query.bindings, ['logisticGroup']);
      },
      (query) => {
        t.is(
          query.sql,
          'select `item_vessel_fees`.* from `item_vessel_fees` inner join `items` on `item_vessel_fees`.`item_id` = `items`.`id` inner join `orders` as `o` on `o`.`id` = `items`.`order_id` left join `addresses` as `a` on `a`.`id` = `o`.`address_id` inner join `item_products` as `ipd` on `ipd`.`item_id` = `items`.`id` inner join `item_prices` as `ip` on `ip`.`item_product_id` = `ipd`.`id` left join `item_vessel_fees_billing_documents` as `document` on `item_vessel_fees`.`id` = `document`.`item_vessel_fee_id` inner join `item_vessel_fees_groups` as `ivfg` on `item_vessel_fees`.`id` = `ivfg`.`item_vessel_fee_id` inner join `groups` as `ip_groups` on `ip`.`group_id` = `ip_groups`.`id` left join `vessels` as `v` on `v`.`id` = `items`.`vessel_id` where `item_vessel_fees`.`active` = ? and `item_vessel_fees`.`start_date` <= ? and `ipd`.`active` = ? and `ipd`.`type` in (?, ?) and `ip`.`active` is not null and `ip`.`modified_price_id` is not null and `ivfg`.`group_type` = ? and `ivfg`.`active` = ? and `ivfg`.`billable` = ? and `items`.`status` <> ? and (`document`.`item_vessel_fee_id` is null or item_vessel_fees.id NOT IN ((select `item_vessel_fee_id` from `item_vessel_fees_billing_documents` where `active` = ? and `item_vessel_fee_id` is not null and `billing_document_type_id` in (?)))) and `ip_groups`.`type` in (?, ?) and (`v`.`group_id` = ? or `items`.`vessel_id` is null and `ip_groups`.`id` = ?)',
        );
        t.deepEqual(query.bindings, [
          1,
          '2020-07-31',
          1,
          'waste',
          'vessel_delivery',
          'partner',
          1,
          1,
          90,
          1,
          4,
          'logistics',
          'partner',
          'logisticGroup',
          'logisticGroup',
        ]);
        query.response([
          {
            id: 'vesselFeeId',
            item_id: 'anotherItemId',
            start_date: '2020-07-01',
            end_date: null,
          },
        ]);
      },
      (query) => {
        t.is(query.sql, 'select distinct `items`.* from `items` where `items`.`id` in (?)');
        t.deepEqual(query.bindings, ['anotherItemId']);
        return query.response([
          {
            id: 'anotherItemId',
            type: orderType.delivery,
            partner_id: 'anotherPartnerId',
            user_id: 'userId',
            vessel_id: 'vesselId',
          },
        ]);
      },
      (query) => {
        t.is(
          query.sql,
          'select distinct `item_vessel_fees_groups`.* from `item_vessel_fees_groups` where `active` = ? and `item_vessel_fees_groups`.`item_vessel_fee_id` in (?)',
        );
        t.deepEqual(query.bindings, [1, 'vesselFeeId']);
        return query.response([
          {
            id: 1,
            vessel_id: 'vesselId',
          },
        ]);
      },
      (query) => {
        t.is(query.sql, 'select distinct `users`.* from `users` where `users`.`id` in (?)');
        t.deepEqual(query.bindings, ['anotherPartnerId']);
        return query.response([{ id: 'anotherPartnerId' }]);
      },
      (query) => {
        t.is(query.sql, 'select distinct `users`.* from `users` where `users`.`id` in (?)');
        t.deepEqual(query.bindings, ['userId']);
        return query.response([{ id: 'userId' }]);
      },
      (query) => {
        t.is(query.sql, 'select distinct `vessels`.* from `vessels` where `vessels`.`id` in (?)');
        t.deepEqual(query.bindings, ['vesselId']);
        return query.response([
          {
            id: 'vesselId',
            group_id: 'logisticGroup',
          },
        ]);
      },
      {
        sql: 'select distinct `item_products`.* from `item_products` where `active` = ? and `is_main_fraction` = ? and `item_products`.`item_id` in (?)',
        bindings: [1, 1, 'anotherItemId'],
        response: [
          {
            id: 'anotherItemProductId',
            item_id: 'anotherItemId',
            active: 1,
            is_main_fraction: 1,
            product_id: 'productId',
          },
        ],
      },
      (query) => {
        t.is(
          query.sql,
          'select distinct `groups`.*, `groups_users`.`user_id` as `_pivot_user_id`, `groups_users`.`group_id` as `_pivot_group_id` from `groups` inner join `groups_users` on `groups_users`.`group_id` = `groups`.`id` where `groups_users`.`user_id` in (?)',
        );
        t.deepEqual(query.bindings, ['anotherPartnerId']);
        return query.response([
          {
            id: 'anotherPartnerGroupId',
            type: groupType.PARTNER,
          },
        ]);
      },
      (query) => {
        t.is(
          query.sql,
          'select distinct `groups`.*, `groups_users`.`user_id` as `_pivot_user_id`, `groups_users`.`group_id` as `_pivot_group_id` from `groups` inner join `groups_users` on `groups_users`.`group_id` = `groups`.`id` where `groups_users`.`user_id` in (?)',
        );
        t.deepEqual(query.bindings, ['userId']);
        return query.response([
          {
            id: 'userGroupId',
            type: groupType.CUSTOMER,
          },
        ]);
      },
      (query) => {
        t.is(query.sql, 'select distinct `groups`.* from `groups` where `groups`.`id` in (?)');
        t.deepEqual(query.bindings, ['logisticGroup']);
        return query.response([
          {
            id: 'logisticGroup',
            type: groupType.LOGISTICS,
          },
        ]);
      },
      (query) => {
        t.is(
          query.sql,
          'select distinct `item_prices`.* from `item_prices` where `active` is not null and `item_prices`.`item_product_id` in (?)',
        );
        t.deepEqual(query.bindings, ['anotherItemProductId']);
        return query.response([
          {
            id: 'anotherItemPriceId',
            item_price_id: 'anotherItemProductId',
            item_id: 'anotherItemId',
            origin_price_id: 'origin_price_id',
            modified_price_id: 'anotherModifiedPriceId',
            group_id: 'anotherPartnerGroupId',
          },
        ]);
      },
      (query) => {
        t.is(
          query.sql,
          'select distinct `groups_tax_rates`.* from `groups_tax_rates` where `groups_tax_rates`.`group_id` in (?)',
        );
        t.deepEqual(query.bindings, ['anotherPartnerGroupId']);
        return query.response([
          {
            id: 2,
            tax_rate_id: 2,
            group_id: 'anotherPartnerGroupId',
            valid_from: '2000-01-01 00:00:00',
            valid_to: '2030-01-01 00:00:00',
          },
        ]);
      },
      (query) => {
        t.is(
          query.sql,
          'select distinct `groups_tax_rates`.* from `groups_tax_rates` where `groups_tax_rates`.`group_id` in (?)',
        );
        t.deepEqual(query.bindings, ['userGroupId']);
        return query.response([
          {
            id: 3,
            tax_rate_id: 3,
            group_id: 'userGroupId',
            valid_from: '2000-01-01 00:00:00',
            valid_to: '2030-01-01 00:00:00',
          },
        ]);
      },
      (query) => {
        t.is(
          query.sql,
          'select distinct `groups_tax_rates`.* from `groups_tax_rates` where `groups_tax_rates`.`group_id` in (?)',
        );
        t.deepEqual(query.bindings, ['logisticGroup']);
        return query.response([
          {
            id: 2,
            tax_rate_id: 2,
            group_id: 'logisticGroup',
            valid_from: '2000-01-01 00:00:00',
            valid_to: '2030-01-01 00:00:00',
          },
        ]);
      },
      (query) => {
        t.is(query.sql, 'select distinct `prices`.* from `prices` where `prices`.`id` in (?)');
        t.deepEqual(query.bindings, ['anotherModifiedPriceId']);
        return query.response([
          {
            id: 'anotherModifiedPriceId',
            type: priceTypes.weight,
            product_id: 'productId',
            delivery_price: 50,
            retrieval_price: 70,
            fee_per_day: 0.7,
          },
        ]);
      },
      (query) => {
        t.is(query.sql, 'select distinct `groups`.* from `groups` where `groups`.`id` in (?)');
        t.deepEqual(query.bindings, ['anotherPartnerGroupId']);
        return query.response([
          {
            id: 'anotherPartnerGroupId',
            type: groupType.PARTNER,
          },
        ]);
      },
      (query) => {
        t.is(
          query.sql,
          'select distinct `groups_tax_rates`.* from `groups_tax_rates` where `groups_tax_rates`.`group_id` in (?)',
        );
        t.deepEqual(query.bindings, ['anotherPartnerGroupId']);
        return query.response([
          {
            id: 2,
            tax_rate_id: 2,
            group_id: 'anotherPartnerGroupId',
            valid_from: '2000-01-01 00:00:00',
            valid_to: '2030-01-01 00:00:00',
          },
        ]);
      },
    ]);
    t.context.tracker.on('query', runner);

    const { item: item1 } = mockHelper({
      item: {
        id: 'itemId1',
        order_id: 'orderId1',
        type: orderType.delivery,
      },
    });
    const {
      group,
      item: item2,
      taxRate,
      itemVesselFee,
    } = mockHelper({
      group: {
        id: 'logisticGroup',
        type: groupType.LOGISTICS,
        related: {
          taxRates: [
            {
              id: 2,
              tax_rate_id: 2,
              tax: 10,
              _pivot_group_id: 'logisticGroup',
              valid_from: '2000-01-01 00:00:00',
              valid_to: '2030-01-01 00:00:00',
            },
          ],
        },
      },
      taxRate: {
        id: 2,
        tax: 10,
        internal: 'reduced_tax_rate',
      },
      item: {
        id: 'itemId2',
        order_id: 'orderId2',
        type: orderType.delivery,
      },
      itemVesselFee: {
        id: 'vesselFeeId',
        item_id: 'anotherItemId',
        start_date: '2020-07-01',
        end_date: null,
      },
    });
    t.context.getItemsToBillStub.onCall(0).resolves([item1]);
    t.context.getItemsToBillStub.onCall(1).resolves([item2]);
    const result = await generateBillingInformationDto({
      billingDocumentType: billingDocumentTypesStrings.CREDIT,
      group,
      invoiceDate: '2020-07-31',
      dateOfCompletion: '2020-07-31',
      billingPeriod: '2020-07',
      isProforma: true,
      projectAddress: null,
      orderUuid: null,
      userId: 'adminUserId',
      isSummary: false,
    });
    runner.assertFinish();
    t.is(result.billingDocumentType, billingDocumentTypesStrings.CREDIT);
    t.deepEqual(result.group, group);
    t.is(result.invoiceDate, '2020-07-31');
    t.is(result.billingPeriod, '2020-07');
    t.is(result.isProforma, true);
    t.is(result.userId, 'adminUserId');
    t.is(result.isSummary, false);
    t.deepEqual(result.billedIndividualBillingDocumentPositionIds, []);
    t.deepEqual(result.billedItemPricesBillingDocumentIds, []);
    t.deepEqual(result.billedItemVesselFeeBillingDocumentIds, []);
    t.deepEqual(result.billedVesselFeeBillingDocumentIds, []);
    t.deepEqual(result.notBilledPrices, []);
    t.is(result.projectAddress, null);
    t.is(result.reversalBillingDocument, undefined);
    t.is(result.cancellationType, undefined);
    t.is(result.billingDocumentDto, undefined);
    t.is(result.isIndividual, undefined);
    t.is(result.taxRate.id, taxRate.get('id'));
    t.deepEqual(result.items, [item1, item2]);
    t.is(result.vesselFees.length, 1);
    result.vesselFees.forEach((v) => {
      t.is(v.get('id'), itemVesselFee.get('id'));
    });
  },
);
