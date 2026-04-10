# Early Bird — Phase 1 Wireframe Review Notes

Exported from public/review.html (scratch tool, not part of app).

## 01. landing-buyer
1. The phone number and cta needs to be glued to the bottom of the display, it can't be below the fold.
2. The "Get started" piece needs more clarity. This page has two goals - explain what this is to the user and get them to log in.
3. Needs an FAQ and About at the bottom
4. Needs a "Dealer, Click Here" button on the top right.

## 02. landing-dealer
1. Similar not as on the buyer page. Need the CTA pinned to bottom of display. can't be below the fold.
2. Make sure it's clear that they do the deal directly. Its free. we don't take a cut.
3. Add FAQ and About. Section.
4. Remember dealers are also buyers. probably should mention.

## 03. onboarding
1. This is the first page that looks a bit busy and clunky.
2. This upload and size limit is insane. It should just be "take a selfie" to continue. We need this so that the dealers will recognize you.
3.I think you're a bit confused about the "pre-buy" thing. They are not just prebuying. They are shopping on this app but paying the dealer directly. They are shopping the good stuff.
4. Display name can be whatever they put it. If they put John C. then dealer sees John C. If they put John Chen then dealer see John chen. if theres a length issue in the UI we can truncate or limit characters or something.
5.I feel like the verified pill styling is a bit tight. No padding so it's pretty naive looking. I also think that green color is just too much.
6. I'm not sure the "heads up" message is useful here. Might be good on another screen.
7. On the buyers account section it seems like there are a bunch of options that would make sense here. like subscribe to these flea markets. various settings. Make a note in the .md that the buyers onboarding should have those things.

## 04. buy-feed
1. dealer avatars feel small.
2. All/Saved and Dealer Category are fighting eachother. The all/saved styling looks totally out of place. it's also a different height than the other elements in the row.
3. So this screen seems sort of like the main screen the buyer sees when he logs in, but i don't think you're thinking carefully about this. The buyer is going to come to the landing page and put in there number. They will get a magic link. It takes them to the onboarding. Once they get through that they come here... unless the drop hasn't happened. We need a landing page that looks kind of like the landing-buyer that has the markets and countdowns and FAQ. And a probably the next market should be expanding bigger than the others. And in big letters it should say something like: You will be texted when the stuff drops. Maybe it'll be a checkbox thing. But my point is that that page with the markets on it is really their home page. And if they click on the early bird logo that's where they should go i would think. Please fix the .md file so it understands the correct flow. and build this page and include it in this wireframe reviewer.

## 05. watching
1. red price drop pill has internal vertical alignment issues. we've discussed this elsewhere. i also don't think such a pwerfull color is appropriate for a price drop.
2. instead of just saying "inquiry sent" why not actually show the message. We're not hurting for vertical space here.
3. the "8 items you care about" title is a bit much. How about "Watching 8 items"
4. I think the hearts should be black.

## 06. item-detail-buyer
1. I hate pop ups in mobile. Make this a drawer slides up from the bottom.
2. I want to make it clear because some of the content in these screens seems to indicate that you are confused that the dealers aren't just previewing in this app. The value of the app is allowing them to buy before the market opens. I want you to take make a note in the .md files that fixes whatever the source of this confusion is.
3. I find that X very small.
4. This is supposed to be the buyer view of the item detail but i think you've make a mistake and not build a view of this page without the send inquiry pop up. This seems like a mistake that came from the .md file. I believe we need to make another screen so i can review. this.
5. Also the "buyer view" at the top seems inadvertant on your part. It should just say [object name]

## 07. item-detail-dealer-own
1. I hate the style of the back arrow and its too small
2. I feel like the live pill and the 3 inquiries pills are clashing.
3. THe live / hold / sold selector feels like it doesn't fit. color is crazy. Also maybe it could be clearer that the dealer should mark sold when it's sold.
4. Why does it say "dealer own state 2" at the top. probably should say the object name?

## 08. item-detail-dealer-browsing
1.i've given the price drop pill note elsewhere.
2. i don't understand where the "art deco" comes from.

## 09. sell-booth-setup
1. top arrow note from earlier applies here
2. so i think we have some site organization issues here similar to what we had on the buyer side. Let's track the dealers path. When they first arrive at the site they are on the dealer landing page. They put in their number and get a magic link which they follow. I gather your thinking they would come here. And i'm thinking they would come to a "logged in" view of the landing page that shows the upcoming markets and they set up their booth for the event of their choice. and there should certainly be language that explains how the drop works and persuades them to get setup and do this. Please fix the .md file so it understands the correct flow. and build this page and include it in this wireframe reviewer.
3. Remove "row / area" and landmark hint. Booth number is fine.
4. I wanna remove the payment account info. This is more about the dealer telling customer what they accept. update the .md accordingly. The reason im doing this is that if the customer can see the payment account they might send a payment before dealer approves sale and it might create a messy situation that i don't wanna be in the middle of.
5.

## 10. sell-booth-active
1. The all/live/held/sold pickeer feels totally out of place. Wrong heigt for the row as well....
2. The design of all the pills and buttons has no hierachy. Everything is sort of screaming at once.
3. Don't you think its a waste to have BOTH the release button and the hold button? shouldn't those be sort of joined into one design element?
4. I think the "dropped" pill is unnecessary. The crossed out price is sufficient.
5. Per my last few comments i think you should really work on thinking this page through.
6. Also i think you can do better with the styling of the footer. And this applies everywhere. I don't think the line-above indicator style feels consistent with the design system.

## 11. sell-add-item
1. Theres like a gap right below "live instantly" line where we can see the content scrolling below which is a glitch.
2. This item is only "live instantly" if the seller posts it after the drop, right?
3. Remove "no haggling at booth"
4. I think only the picture, cat and title should be required
5

## 12. sell-market-picker
1. i don't really see the point of this page. Most dealers won't be focused on the market in two weeks. in other notes i've made the case for a logged in dealer landing page that has the other markets and they can navigate via that page.
2. Please update the .md and remove this and also remove it here in the wireframe review.

## 13. account-buyer
1. i don't see a screen for "EDIT". maybe everything should be editable directly on this page..
2. i like the markets you follow feature. I don't understand what "follow more" woudl do.
3. What does become a dealer do?
4. I don't like the way the pills with the marketplaces look. especially the "follow more" something about camel case and this font and pills with almost not padding. i'ts an odd look.

## 14. account-dealer
1. similar note to the buyers account page. Seems like a bunch of things that could be on an oboarding page... but i guess we make the dealer onboarding super streamlined so maybe we shouldn't over complicate.

2. But definitely remove the venmo and zell account info.
3. I don't understand where the edit button takes you. it seems like the business name is editable right here? Maybe everything should be editable right here?

4. so the booth defaults need to be broken down by markets they sell at, right? And its not

5. I don't really see the point of the metrics
