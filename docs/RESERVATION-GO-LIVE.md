# Reservation Enquiries — WhatsApp / Call Flow

This implementation is a lightweight, no-custom-backend enquiry flow. It does not require a Supabase project, database migration, server-side reservation API, or notification-provider credentials.

## Guest journey

1. Guest selects dates, adults, children, room count and preferred room category.
2. Guest enters their name and mobile number; email and special requests are optional.
3. The page prepares a WhatsApp message from the entered details.
4. The guest can edit the entire message or replace it with their own wording.
5. The guest chooses one of the published hotel contact numbers. WhatsApp opens with the message prefilled; the guest must review it and press Send.
6. Guests who prefer a phone call can use the direct Call links.

## Important behavior and limitations

- WhatsApp links use the hotel's published contact numbers: +91 83690 11041 and +91 77000 03843. Confirm that both numbers are registered on WhatsApp before public launch.
- A WhatsApp link opening successfully does not prove that a message was sent or delivered.
- No enquiry is stored by the website. The hotel receives the details only after the guest sends the WhatsApp message or calls.
- The form does not check live room inventory, calculate tariff/taxes, collect payment, or confirm a reservation.
- Hotel staff must verify availability, final tariff, taxes and inclusions before confirming a stay.
- Do not describe this as instant booking, a live booking engine, or an automatically recorded reservation system.
- Guest-entered message content is user-controlled and is not submitted to a website API.

## Release verification

- [ ] Check both WhatsApp destination numbers are active WhatsApp accounts controlled by the hotel.
- [ ] Test each WhatsApp link on Android and iPhone; confirm the prefilled message includes the entered booking details.
- [ ] Edit the prefilled message and verify the edited text is retained when WhatsApp opens.
- [ ] Reset the message and verify it returns to the latest form details.
- [ ] Test both Call links on a mobile device.
- [ ] Verify required name/mobile/date fields and invalid date handling.
- [ ] Verify the page on desktop and mobile.
- [ ] Confirm the hotel team understands that WhatsApp messages are customer-initiated and the website stores no booking records.

## Future upgrade path

If the hotel later needs an automatic enquiry register, staff dashboard, confirmed inventory, rate calculation or payment collection, add a managed backend or booking/PMS integration as a separate phase.
