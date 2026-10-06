What exactly does the website gets from the API?
- The website only makes one request:
"GET /api/v1/compounds
Header: x-api-key: student-api-key-123"
- The first line is the protected route that returns every compound data, while the 2nd line is for authenticating the api key.
- Once everything is done, it responds by sending the JSON file of the compounds into a compounds array that is stored in the allCompounds variable.

It doesn't use all the field data for each compound but only some of it:
> composition being the core field used in showing the periodic table elements and which periodic table tiles unlock and the recipe bench must match.
> id for found compounds tracking
> name, formula for the discovery log cards
> physicalProperties.state, molarMass, meltingPointCelsius, boilingPointCelsius for the reveal pop-up
> description also for the reveal pop-up

The whole logic flow
- Page Loads
- saved progress is read from localStorage
- init() fetches the compound data
- periodic table unlocks elements found in composition
- the player clicks elements in the bench
- every change compares the bench signature to every compound's signature
- once matched, the compound is saved, logged, and revealed