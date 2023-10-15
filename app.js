const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDb();
const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//API-1 Getting ALl States

app.get("/states/", async (request, response) => {
  const stateNames = `select * from state`;
  const allStatesArray = await db.all(stateNames);
  response.send(
    allStatesArray.map((eachObject) =>
      convertDbObjectToResponseObject(eachObject)
    )
  );
});

//API-2 Getting particular state based on state_id

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
    select * from state where state_id=${stateId}`;
  const stateDetails = await db.get(stateQuery);
  response.send(convertDbObjectToResponseObject(stateDetails));
});

//API-3 Creating District

app.post("/districts/", async (request, response) => {
  const newDistrict = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = newDistrict;
  const addingNewDistrict = `
    insert into
    district(district_name,
        state_id,
        cases,
        cured,
        active,
        deaths)
    values(
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}')`;
  const dbResponse = await db.run(addingNewDistrict);
  const newDistrictDetails = dbResponse.lastID;
  response.send("District Successfully Added");
});

//API-4 Returns a district based on the district ID

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = `
    select * from district where district_id=${districtId}`;
  const districtArray = await db.get(districtDetails);
  response.send(convertDbObjectToResponseObject(districtArray));
});

//API-5 Deletes a district from the district table based on the district ID

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const removeDistrict = `Delete from district where district_id=${districtId}`;
  await db.run(removeDistrict);
  response.send("District Removed");
});

//API-6 Updates the details of a specific district based on the district ID

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const updateDistrictDetails = `
    update district set
       district_name= '${districtName}',
       state_id ='${stateId}',
       cases ='${cases}',
       cured ='${cured}',
       active ='${active}',
       deaths ='${deaths}'
       where district_id=${districtId}`;
  await db.run(updateDistrictDetails);
  response.send("District Details Updated");
});

//API-7  Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
    select
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    from district
    where 
    state_id=${stateId}`;
  const stateDetails = await db.get(stateQuery);
  response.send({
    totalCases: stateDetails["SUM(cases)"],
    totalCured: stateDetails["SUM(cured)"],
    totalActive: stateDetails["SUM(active)"],
    totalDeaths: stateDetails["SUM(deaths)"],
  });
});

//API -8 Returns an object containing the state name of a district based on the district ID

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateQuery = `
select 
state_name
from
state natural JOIN district

where
district.district_id=${districtId}`;

  const stateName = await db.get(stateQuery);
  response.send(convertDbObjectToResponseObject(stateName));
});

module.exports = app;
