const moment = require("moment");
const aws = require("aws-sdk");
aws.config.update({ region: "us-east-1" });

const db = new aws.DynamoDB();
const dbClient = new aws.DynamoDB.DocumentClient();

exports.handler = async function (event, _, callback) {
  // 1. Get number from caller remove anything but numbers and convert to array
  var receivedAttribute =
    event["Details"]["ContactData"]["CustomerEndpoint"]["Address"];
  var callersNumber = receivedAttribute.replace(/[^0-9]/g, "");
  console.log("CallersNumber:", callersNumber);

  // 2. convert number to alphas
  const vanityNumbers = convertToVanity(callersNumber.split(""));
  console.log("vanityNumbers", vanityNumbers[25]);

  // 3. decide on 5 best vanity numbers
  const fiveBestNums = pickFiveVanity(vanityNumbers);
  console.log("5 best", fiveBestNums);

  // 4. create table if doesnt exist
  await checkForTable();

  // 5. save caller data to db
  await saveCallerData(callersNumber, fiveBestNums.join("-"));

  // 6. get vanity numbers from db and return 3
  var threeBestNums = await getCallerData(callersNumber);

  var resultMap = {
    Number1: threeBestNums[0],
    Number2: threeBestNums[1],
    Number3: threeBestNums[2],
  };

  callback(null, resultMap);
};

function convertToVanity(phoneNum) {
  console.log("inside convert to vanity", phoneNum);
  const alphaNumPad = {
    1: [""],
    2: ["A", "B", "C"],
    3: ["D", "E", "F"],
    4: ["G", "H", "I"],
    5: ["J", "K", "L"],
    6: ["M", "N", "O"],
    7: ["P", "Q", "R", "S"],
    8: ["T", "U", "V"],
    9: ["W", "X", "Y", "Z"],
    0: [" "],
  };

  var finalList = [""];
  var createVanity = [""];

  phoneNum.forEach((e) => {
    // adding this because if it starts with 1 or 0 it breaks
    if (e === "1" || e === "0") {
      return;
    }

    var alphas = alphaNumPad[e];
    if (finalList.length > 1) {
      // populate array with what is currently in our vanity list
      finalList.forEach((el) => {
        createVanity.push(el);
      });
    }

    // clear final list
    finalList.length = 0;

    // add new letter to each vanity and then back to final list
    createVanity.forEach((vans) => {
      alphas.forEach((l) => {
        finalList.push(vans + l);
      });
    });
    //clear old vanity list
    createVanity.length = 0;
  });

  // return list of vanity numbers
  return finalList;
}

// a shuffle for the vanity numbers to make sure
//if you call with the same number you get different results
function shuffle(arr) {
  var shuffledArr = arr,
    len = arr.length,
    rng = Math.random,
    random,
    temp;

  while (len) {
    random = Math.floor(rng() * len);
    len -= 1;
    temp = shuffledArr[len];
    shuffledArr[len] = shuffledArr[random];
    shuffledArr[random] = temp;
  }

  return shuffledArr;
}

function pickFiveVanity(vanityNumbers) {
  var favFive = [];
  var removeFive = [];

  // shuffle array
  shuffledVanities = shuffle(vanityNumbers);

  shuffledVanities.some((e, index) => {
    var vanitySize = e.length;
    // try and get vanity numbers with plenty of vowels
    var vowels = e.match(/[^AEIOU]/g).length;

    // make sure the entire vanity number isnt just vowels
    if (vowels <= vanitySize / 2) {
      favFive.push(e);
      removeFive.push(index);
    }

    // exit out of loop
    return favFive.length === 5;
  });

  // remove the numbers we already put in favFive
  removeFive.forEach((e) => {
    shuffledVanities.slice(e, 1);
  });

  // if 5 were not chosen based on vowels, randomly select numbers
  while (favFive.length < 5) {
    favFive.push(
      shuffledVanities[Math.floor(Math.random() * shuffledVanities.length - 1)]
    );
  }

  // return our five favorite
  return favFive;
}

async function checkForTable() {
  return new Promise((resolve, reject) => {
    // create a table if it doesnt exist
    db.describeTable(
      {
        TableName: "vanity",
      },
      (err, _) => {
        // if table isnt found, create it
        if (err) {
          if (err.code === "ResourceNotFoundException") {
            console.log("Creating Table..");
            createDBTable();
            // wait for status change
            db.waitFor("tableExists", { TableName: "vanity" }, (err, _) => {
              if (err) {
                reject(err);
              } else {
                console.log("Created");
                resolve();
              }
            });
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      }
    );
  });
}

async function saveCallerData(caller, data) {
  return new Promise((resolve, reject) => {
    // save caller data
    dbClient.put(
      {
        TableName: "vanity",
        Item: {
          callers_number: caller,
          timestamp: moment().unix(),
          vanity_numbers: data,
        },
      },
      (err, _) => {
        if (err) {
          reject(err);
        } else {
          console.log("Item Added");
          resolve();
        }
      }
    );
  });
}

function createDBTable() {
  // create table to store vanity numbers per caller
  db.createTable(
    {
      TableName: "vanity",
      AttributeDefinitions: [
        {
          AttributeName: "callers_number",
          AttributeType: "S",
        },
        {
          AttributeName: "timestamp",
          AttributeType: "N",
        },
      ],
      KeySchema: [
        {
          AttributeName: "callers_number",
          KeyType: "HASH",
        },
        {
          AttributeName: "timestamp",
          KeyType: "RANGE",
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    },
    (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    }
  );
}

async function getCallerData(callersNumber) {
  return new Promise((resolve, reject) => {
    var getThree = [];
    dbClient.query(
      {
        TableName: "vanity",
        KeyConditionExpression: "callers_number = :1cnum",
        ExpressionAttributeValues: {
          ":cnum": callersNumber,
        },
      },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          data.Items.forEach((e) => {
            getThree = e.vanity_numbers.split("-");
            shuffle(getThree);
          });
          resolve(getThree.slice(2));
        }
      }
    );
  });
}
