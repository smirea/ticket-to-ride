# Ticket to Ride - Classic USA Rules

This document is a faithful Markdown conversion of the classic USA base-game rulebook. It preserves the complete gameplay specification while omitting promotional copy, artwork, and publisher credits that do not affect play.

- Official English rulebook: [Days of Wonder, 2015 edition](https://ncdn0.daysofwonder.com/tickettoride/en/img/tt_rules_2015_en.pdf)
- Players: 2-5
- Playing time: 30-60 minutes
- Rules scope: classic North America base game, not First Journey or USA 1910 variants

## Components used by the rules

- 1 North America board with railway routes and a scoring track
- 45 train pieces in each of five player colors
- 1 scoring marker in each player color
- 110 Train Car cards:
  - 12 cards in each of eight regular colors: purple, blue, orange, white, green, yellow, black, and red
  - 14 multicolored Locomotive cards
- 30 Destination Ticket cards
- 1 Longest Continuous Path bonus card worth 10 points

## Setup

1. Put the board in the center of the table.
2. Each player takes 45 train pieces and the matching scoring marker.
3. Put every scoring marker on the start of the scoring track.
4. Shuffle the Train Car cards and deal 4 to each player.
5. Put the remaining Train Car cards face down as the draw deck.
6. Turn the top 5 Train Car cards face up beside the deck.
7. Put the Longest Continuous Path bonus card face up beside the board.
8. Shuffle the Destination Tickets and deal 3 to each player.
9. Each player keeps at least 2 of those tickets and may keep all 3. Put every returned ticket on the bottom of the Destination Ticket deck.
10. Destination Tickets remain secret until final scoring.
11. The most experienced traveler goes first; turns then proceed clockwise.

## Objective

Win by finishing with the most points. Players score by:

- claiming routes between adjacent cities;
- completing the city connections shown on Destination Tickets; and
- having one of the longest continuous paths at the end of the game.

An incomplete Destination Ticket subtracts its printed value during final scoring.

## Turn structure

On a turn, a player performs exactly one of these actions:

1. Draw Train Car cards.
2. Claim one route.
3. Draw Destination Tickets.

The chosen action must be completed before the next player begins.

## Draw Train Car cards

- A player normally draws 2 Train Car cards, one at a time.
- For each draw, the player may take one of the 5 face-up cards or draw blindly from the top of the deck.
- After a face-up card is taken, replace it immediately from the draw deck before the player chooses the second card.
- A face-up Locomotive uses both draws. A player who takes one ends the action immediately.
- A face-up Locomotive cannot be taken as the second card.
- A blindly drawn Locomotive counts as only one draw, so the player may still take a second card.
- If 3 or more of the 5 face-up cards are Locomotives, discard all 5 and reveal a new set of 5 immediately.
- There is no hand-size limit.
- When the draw deck is empty, shuffle the discard pile thoroughly to form a new draw deck.
- If both the draw deck and discard pile are empty, drawing Train Car cards is unavailable. The player must claim a route or draw Destination Tickets instead.

## Claim a route

- A player may claim at most one route per turn.
- The route must be open.
- A claimed route does not need to connect to the player's existing network.
- Play a set of Train Car cards equal to the route's length.
- Cards used for one route must all be the same regular color, with any number of Locomotives substituting as wild cards.
- A colored route requires cards matching that route's color, plus optional Locomotives.
- A gray route may be claimed with any one regular color, plus optional Locomotives.
- Discard all cards used for the claim.
- Place one train piece on every space of the route.
- The player must have at least as many train pieces remaining as the route's length.
- Score the route immediately according to the route scoring table.

### Double routes

- A single player may never claim both routes between the same pair of cities.
- In a 2- or 3-player game, claiming either half of a double route permanently closes the other half to every player.
- In a 4- or 5-player game, both halves may be claimed, but they must belong to different players.

## Route scoring

| Route length | Points |
| -----------: | -----: |
|            1 |      1 |
|            2 |      2 |
|            3 |      4 |
|            4 |      7 |
|            5 |     10 |
|            6 |     15 |

## Draw Destination Tickets

- Draw the top 3 Destination Tickets.
- If fewer than 3 remain, draw every available ticket.
- Keep at least 1 drawn ticket and optionally keep more.
- Put every returned ticket on the bottom of the Destination Ticket deck.
- Kept tickets remain secret until final scoring.
- There is no limit to the number of Destination Tickets a player may hold.
- Drawing and keeping Destination Tickets consumes the entire turn.

## Completing Destination Tickets

- A Destination Ticket is complete when the player owns a continuous chain of claimed routes connecting its two named cities.
- Completed tickets add their printed values during final scoring.
- Incomplete tickets subtract their printed values during final scoring.
- A player's network may branch, loop, and reuse cities when checking whether two ticket cities are connected.

## End of the game

- Check the end condition at the end of each turn.
- When the active player has 0, 1, or 2 train pieces remaining, the final round begins.
- Every player, including the player who triggered the final round, receives exactly one additional turn.
- After those final turns, the game ends and final scoring begins.

## Final scoring

1. Confirm the points earned from every claimed route.
2. Reveal all Destination Tickets.
3. Add the value of each completed ticket.
4. Subtract the value of each incomplete ticket.
5. Determine each player's longest continuous path of claimed routes.
6. Every player tied for the longest path receives 10 bonus points.

### Longest continuous path

- Only the claiming player's own train pieces count.
- The path may loop and may pass through the same city more than once.
- A claimed route segment may not be used more than once in the same path.
- Branches do not all count automatically; the score is the longest single continuous trail that obeys the no-reused-route rule.

## Winner and tie breakers

1. The player with the most points wins.
2. If tied on points, the tied player who completed the most Destination Tickets wins.
3. If still tied, the tied player who received the Longest Continuous Path bonus wins.
4. If players remain tied after every printed tie breaker, they share the winning rank.

## Engine invariants

The implementation must preserve these additional rule consequences:

- Configured player order is clockwise; an explicitly selected starting traveler rotates that order without changing the seating sequence.
- A turn cannot mix actions, such as drawing one card and then claiming a route.
- Public state includes claimed routes, scores, remaining train pieces, face-up cards, and deck counts.
- Train Car hands and Destination Tickets remain private to their owners until rules require revelation.
- Random shuffles and blind draws must be reproducible from persisted game state so a saved or replayed game resolves identically.
