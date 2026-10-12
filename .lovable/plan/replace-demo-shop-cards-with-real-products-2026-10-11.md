# Replace demo Shop cards with real products

## Goal
Replace the eight sample Shop listings with Erica’s real catalogue while keeping the existing compact grid, search, filters, wishlist, and product popup.

## Plan
1. **Collect the real catalogue source**
   - Use the store website, individual product links, or an uploaded spreadsheet/CSV supplied by Erica.
   - Capture each product’s exact name, brand, current price and currency, available sizes, colours, stock status, description, product photos, and canonical store link.
   - Do not invent any missing value; show “Price not listed,” “Sizes not listed,” or “Availability not listed” when the source does not provide it.

2. **Replace the demonstration catalogue**
   - Remove all eight placeholder products and their demo labels.
   - Add the sourced products with accurate searchable categories and fashion-term tags.
   - Store product imagery through the project’s asset flow rather than hotlinking images.

3. **Update Shop presentation**
   - Display the products’ real currency and remove the “demonstration catalogue” notice.
   - Make every “Shop at retailer” action open the correct product page.
   - Preserve the existing missing-versus-unavailable distinction, filters, saved-item behavior, and detail gallery.

4. **Verify the customer flow**
   - Check product counts, search, every filter, wishlist persistence, image galleries, prices, sizes, availability labels, and outbound store links.
   - Verify the Shop section at phone and desktop widths and confirm the page builds without errors.

## Needed before implementation
A store URL, individual product links, or a product file is required. Without a source, real products and prices cannot be verified and will not be guessed.

## Technical details
This remains a local catalogue update; no account system or database is added. If the catalogue must stay synchronized with a live store, that would be a separate integration after identifying the store platform and API access.
