# VanityNumbers
Vanity Number Generator
* phone number to my amazon connect instance is **+1 281-220-1392**

## Setup

- Make sure to have an AWS account and aws-sdk installed.
- Pull done the repo and run npm install
- Create an S3 bucket to store the deployment
- in terminal at the root of the project run 

` aws cloudfromation package --template-file template.yml --output-template-file <give a name>-tempalte.yml --s3-bucket <name of an existing s3 bucket> `

- once that is successful a new yaml template should have been created
- next in the terminal run

` aws cloudformation deploy --template-file <name of newly generate yml file> --stack-name <name your stack> --capabilities CAPABILITY_IAM `
  - you may need to give the created IAM role dynamodb read/write access

- Lastly, make sure to have an Amazon Connect account and the contact flow used for this app can be found in the folder **contact flow**
  - you will need to add the lambda you just created to your contact flow
  - https://docs.aws.amazon.com/connect/latest/adminguide/connect-lambda-functions.html#add-lambda-function
  - If you want to test the lambda in aws use the object below
  ```
  {
  "Details": {
    "ContactData": {
      "CustomerEndpoint": {
        "Address": "+1234567890"
      }
    }
  },
  "Name": "ContactFlowEvent"
  }
  ```

## Implementation

I decided to just generate every possible vanity outcome based on the phone number given. The Pros to this is the logic around choosing the vanities to respond back with is much less. The con to this is you can end up with some vanity numbers that just are not readable or understandble.

When it came to choosing 5 to save, i just picked the first 5 that had atleast half the length of the phone number in vowels. This would adleast attempt to pick words that would actually be understood. I also created a way to shuffle the generated vanity numbers to insure if a caller called multiple times, we could still respond with vanity options they may not have heard yet.

As for the Amazon Connect contact flow, I just invoked the lambda immediately once called, explained the app, responded with the first 3 entires in the database for that caller, and after the response, i gave my farewells and ended the call to keep it simple.

![Architecture Diagram](vanityArchitecture.pdf)

## Struggles

A lot of what i implemented was using tools i have never used before which made this very exciting. Getting set up with DynamoDB and understanding how to save and retreive items proved difficult. Then i learned about DynamoDB Client and it made adding and querying items much easier. The next hurdle was the actual logic in deciding how to generate vanity numbers. First issue was dealing with the number 1 and 0 because they do not have any letters. I chose to just skip iteration on those two numbers because it was causing complications when trying to generate vanity numbers. 

## Shortcuts

One shortcut that i decided to take was with skipping the number if it was 1 and 0. This is bad for production because if a caller called with all 1s or all 0s then it would break the app and return nothing. For Amazon Connect contact flow i made it too simple and could have created a better caller experience from start to finish. I also kept the entire app in one js file which is a little messy and should be split into files based on purpose.

## What would I have done with more time ?

I would finalized a working web app and deployed to show the most recent users. I tried to approach that in so many different ways but was met with constant obstacles that made that objective very time consuming. I also would have added many ways to make this more secure like adding a login feature with aws cognito or restricting caller access to the lambda. I would have liked to make a majority of the deployment process more automated, possibly by utilizing codebuild and CI/CD processes to help with future commits and builds. I definitely would have liked to see some statistics on how many callers used the app, or maybe some of the best vanity numbers generated and saved it do a dashboard like new relic.
