This repo will be used to login [p2pay-cloud](https://github.com/p2payserver/p2pay-cloud) without the needs to install and use a database. 

Create 3 stores in a btcpay server instance, one for users one for sessions and one for verificationTokens and provide the stores id as enviroment variables together with the instance url and api key.    
To keep the instance clean, I suggest creating them under a separated user service account.  
The required scopes for the api key are read and write invoices.
The invoices created in these stores will be used as your db documents. 

https://authjs.dev/guides/creating-a-database-adapter

https://chatgpt.com/c/67e26c07-372c-8013-86c7-69c53d34be55