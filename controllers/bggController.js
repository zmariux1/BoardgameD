const axios = require('axios');
const { parseString } = require('xml2js');

async function fetchXMLData() {
  try {
    const response = await axios.get('https://boardgamegeek.com/xmlapi/search?search=Crossbows%20and%20Catapults');
    return response.data;
  } catch (error) {
    console.error('Error fetching XML data:', error);
    return null;
  }
}

const getBGG = async (req, res) => {
  try {
    const xmlData = await fetchXMLData();
    if (xmlData) {
      parseString(xmlData, async (err, result) => {
        if (err) {
          console.error('Error parsing XML:', err);
          res.render('error', { error: 'Error parsing XML' });
        } else {
          const boardgames = result.boardgames?.boardgame || [];
          const extractedGames = [];

          // Fetch additional data using objectid from the second API
          for (const game of boardgames) {
            const objectIdImport = game.$.objectid;
            try {
              const response = await axios.get(`https://api.geekdo.com/xmlapi/boardgame/${objectIdImport}`);
              const secondResult = await parseXML(response.data);
              // console.log(secondResult)

              const yearPublished = secondResult?.boardgames?.boardgame?.[0]?.yearpublished || 'N/A';
              const thumbnail = secondResult?.boardgames?.boardgame?.[0]?.thumbnail || 'N/A';
              
              console.log(yearPublished); // Check if yearPublished is retrieved correctly
              console.log(thumbnail); // Check if thumbnail is retrieved correctly

              extractedGames.push({
                objectid: objectIdImport,
                yearPublished,
                thumbnail
              });
            } catch (error) {
              console.error('Error fetching data from the second API:', error);
            }
          }

          res.render('test', { results: extractedGames });
        }
      });
    } else {
      res.render('error', { error: 'No XML data fetched' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.render('error', { error: 'An error occurred' });
  }
};

async function parseXML(data) {
  return new Promise((resolve, reject) => {
    parseString(data, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

module.exports = {
  getBGG
};
