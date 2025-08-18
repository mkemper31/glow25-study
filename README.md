# Glow25 Case Study

## Overview

This is a brief case study presenting a solution for fetching and displaying user-specific data on a Shopify Liquid landing page.

Its components are a node.js server which serves as an endpoint for Shopify app proxy calls, and a basic Liquid user landing page.

### Server

The server uses Express for routing, as well as a MySQL connection to connect to a local database. It also imports the latest Shopify GraphQL-based API, which is used to retrieve data from the Shopify customer and product APIs.

#### Assumptions

The server is assumed to have access to a MySQL database with local user data regarding favorite products. For the purposes of the case study, these favorite products are simple ID assignments. In a production environment, it is likely that such an assignment would be derived from more holistic metrics, such as purchase frequency, related product purposes, or viewed products.

Further, the server is assumed to have environment variables pointing to the Shopify API with API keys, secret keys, and other access flow tokens, along with credentials for MySQL database connection. For demonstrative purposes, those placed in the code are placeholders.

### Liquid Template

The Liquid template provided is fairly barebones, which in a second pass is something I would focus on iterating upon. It exists, at this point, primarily to perform the required API function call, sending the URL query to the app proxy server.

Once the response is received, the script will then manipulate the DOM to display the associated data - the first name, profile image, and associated favorite product of the user whose ID was declared in the URL query parameters.

If no response is received, or if the user ID is not provided, it will instead display an error message

#### Assumptions & Trade-Offs

The template is assumed to be a child of an existing Shopify theme and would exist as a component page within that environment.

As said before, it's barebones and needs fleshing out, but my primary focus was on learning and implementing Shopify's GraphQL API interface and working with the app proxy setup. In a next pass, presentation would be a primary focus.

### Code Overview

The server code is fairly straightforward. First, an Express app is declared, and a MySQL connection established. The route for the user landing page API call is declared, which is the meat of the code. The API call works as follows:

1. First, the user ID is fetched from the query parameters and validated against the database - fetching the first name and profile image from the Shopify API.
2. Next, once the user ID is validated, a local MySQL database query is performed to fetch the user's favorite product ID.
3. That product ID is then used to fetch product information - specifically the name, description, URL, and image data.
4. Once all required data is collated, it is sent as a response to the initial GET request.
5. That response data is then parsed by the script on the template side and the DOM is manipulated to present it to the user.

## Installation

1. Clone the git repository:
`git clone https://github.com/mkemper31/glow25-study.git`


### Shopify App Setup

The following setup instructions will assume the user has a Shopify partner account, and has already created a development store, but has not yet created an app with which to proxy.

1. Navigate to the Shopify Partners dashboard (https://partners.shopify.com/) and log in.

2. Select Apps from the left side bar, and select Create App.

3. Select Create App from Scratch and choose a name.

4. On the left side pane, select Configuration.

    1. In URLs, update the URL to point to your store URL (eg. https://case-study-store.myshopify.com/)
    2. Scrolling down, find the section labeled App Proxy and select Set up.
    3. Ensure subpath prefix is `apps`, and the subpath is `customer-data`.
    4. In the proxy URL, point to the local server endpoint as exposed to the internet, pointing to the `users` subpath (eg. https://casestudy.net/users)

5. On the left side pane, select API Access. Fetch the client ID and secret for entry into environment variables for the server.

6. On the left side pane, select Distribution.

7. Select custom distribution.

8. Enter the domain for your pre-existing development store, then click Generate Link and confirm.

9. Copy and paste the generated link in browser bar. 

10. Select the store to which you wish to apply the app.

11. Once installed, navigate to your store admin page (https://admin.shopify.com/store/<store_name_here>).

12. Select Online Store from the left side pane.

13. Select your chosen Theme and from the `...` more options button, select Edit Code.

14. Copy the `page.userlanding.liquid` file into the `templates` folder.

15. Exit the code editor.

16. Select the Pages sub-option to the Online Store option from the left-side pane.

17. Select Add Page.

18. Name the page something appropriate, eg. `Landing`. On the right side dropdown, select `userlanding` as the template.

19. Set Visibility to Visible and save.

20. Returning to the Themes tab of the Online Store option, press the `...` more options button and select Preview.

21. Append `/pages/landing?user=<user-id-here>` to the URL and press enter.

22. The landing page should be presented.




### Server Setup
1. Install dependencies:
`npm install`

2. In a production environment, the placeholder values in the server code should be replaced and pointed to environment variables using dotenv in order to securely hold the auth credentials.

3. Ensure the MySQL server is running and has the appropriate schema.

4. Start the server:
`npm init`
