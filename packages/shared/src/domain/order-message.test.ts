import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ORDER_STATUSES } from '../constants.ts';
import { orderWhatsappMessage, whatsappLink, whatsappNumber } from './order-message.ts';

const base = { orderNumber: 'APS-1001', customerName: 'Priya Sharma', grandTotal: 2700000 };

describe('orderWhatsappMessage', () => {
  test('has a message for every status, naming the order', () => {
    for (const status of ORDER_STATUSES) {
      const text = orderWhatsappMessage({ ...base, status });
      assert.ok(text.includes('APS-1001'), status);
      assert.ok(text.startsWith('Hi Priya,'), status);
    }
  });

  test('shipped carries carrier, tracking number and link when present', () => {
    const text = orderWhatsappMessage({
      ...base, status: 'shipped', carrier: 'Delhivery', trackingNumber: '123456', trackingUrl: 'https://t.example/123456',
    });
    assert.ok(text.includes('Delhivery') && text.includes('123456') && text.includes('https://t.example/123456'));
  });

  test('shipped without tracking does not invent any', () => {
    const text = orderWhatsappMessage({ ...base, status: 'shipped' });
    assert.ok(!/tracking no/i.test(text));
  });

  test('never promises a delivery date', () => {
    for (const status of ORDER_STATUSES) {
      assert.ok(!/\b(tomorrow|within \d|by (mon|tue|wed|thu|fri|sat|sun))/i.test(orderWhatsappMessage({ ...base, status })), status);
    }
  });

  test('copes with no name', () => {
    assert.ok(orderWhatsappMessage({ ...base, customerName: null, status: 'paid' }).startsWith('Hi,'));
  });
});

describe('whatsapp links', () => {
  test('adds the country code to a 10-digit mobile', () => {
    assert.equal(whatsappNumber('98765 43210'), '919876543210');
    assert.equal(whatsappNumber('+91 98765 43210'), '919876543210');
  });
  test('rejects a number it cannot use', () => {
    assert.equal(whatsappNumber('12345'), null);
    assert.equal(whatsappLink(undefined, 'x'), null);
  });
  test('encodes the text', () => {
    const link = whatsappLink('9876543210', 'Hi *A*\nline 2 & more')!;
    assert.ok(link.startsWith('https://wa.me/919876543210?text='));
    assert.ok(!link.includes('\n') && !link.includes(' '));
    assert.equal(decodeURIComponent(link.split('text=')[1]!), 'Hi *A*\nline 2 & more');
  });
});
