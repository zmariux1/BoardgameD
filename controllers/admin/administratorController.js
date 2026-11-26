const moment = require("moment");
const User = require("../../models/userModel");
const UserPlus = require("../../models/userPlusDataModel");
const Reputation = require("../../models/ReputationModel");
const Honor = require("../../models/reputation/honerModel");
const Stain = require("../../models/reputation/stainModel");
const Feedback = require("../../models/reputation/feedbackModel");
const FeedbackUs = require("../../models/FeedbackUsModel");

const PreCreateRoom = require("../../models/transitionToRoom");
const Room = require("../../models/userRoomModel");

const InternalBgData = require("../../models/internalBgData");
const TermsAndConditions = require('../../models/termsAndConditionsModel');
const bcrypt = require("bcrypt");
const axios = require('axios');
const { parseString } = require('xml2js'); 
const dotenv = require("dotenv").config();

const nodemailer = require("nodemailer");

// const config = require("../config/config");

const randomString = require("randomstring");



// get data for all the searches inside BGG. Use fetchXMLData() for anywhere it needs data from BGG
async function fetchXMLData() {
  try {
    const response = await axios.get('https://boardgamegeek.com/xmlapi/search?search=Crossbows%20and%20Catapults');
    return response.data;
  } catch (error) {
    console.error('Error fetching XML data:', error);
    return null;
  }
}

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



// ADMINISTRATOR xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// Load terms and conditions Editor
const insertTermsAndConditions_Load = async (req, res) => {
  try {
    // Assuming you have retrieved the TermsAndConditions document from the database
    const termsAndConditions = await TermsAndConditions.find({})

    res.render("admin/insertTermsAndConditionsEditor", { termsAndConditions });
  } catch (error) {
    console.log(error.message);
    // Handle error appropriately
  }
};


const insertTerms_Up = async (req, res) => {
  try {
    // Template 
    // const input = req.body.input;
    // if(input) {
    //   try {
    //     res.render("admin/insertTermsAndConditionsEditor")
    //   } catch(error) {
    //     console.log(error.message)
    //   }
    // }

    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx - add a new category - xxxxxxxxxxxxxxxxxxxxxxxxxx 
    const newCategory = req.body.newCategory;

    if (newCategory) {
      try {
        // Create a new item object


        // Find the Terms and Conditions document
        let termsAndConditions = await TermsAndConditions.findOne({});

        termsAndConditions = new TermsAndConditions({
          category: "Insert a category",
          items: [{
            condition_title: "Insert a title",
            condition_content: ["Insert a content"],
          }],
          agreed_users: [],
        });

        // Save the updated document
        await termsAndConditions.save();


      } catch (error) {
        console.log(error.message);
      }
    }

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx - add a new title - xxxxxxxxxxxxxxxxxxxxxxxxxx 
    const newTitle = req.body.newTitle;
    const category_id = req.body.category_id;

    if (newTitle) {
      try {
        // Find the Terms and Conditions document
        let termsAndCondition = await TermsAndConditions.findById(category_id);

        if (termsAndCondition) {
            // Append new item to the items array
            termsAndCondition.items.push({
                condition_title: "Insert a title",
                condition_content: ["Insert a content"],
            });

            // Save the updated document
            await termsAndCondition.save();
            
            console.log("New item added to the Terms and Conditions document:", termsAndCondition);
            // Here you can send a response or perform any other action
        } else {
            console.log("Terms and Conditions document not found for the provided category ID:", category_id);
            // Handle the case where the document is not found
        }

      } catch (error) {
        console.log(error.message);
      }
    }

    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx - add a new content - xxxxxxxxxxxxxxxxxxxxxxxxxx
    const item_id = req.body.item_id;
    const newContent = req.body.newContent;

    if (newContent) {
      try {

        // Find the category document by category_id
        let theCategory = await TermsAndConditions.findById(category_id);
        
        if (!theCategory) {
          return res.status(404).send("Category not found");
        }

        // Find the specific item within the items array
        const itemToUpdate = theCategory.items.find(item => item._id.toString() === item_id);

        if (!itemToUpdate) {
          return res.status(404).send("Item not found");
        }

        // Append a new empty string to condition_content array
        itemToUpdate.condition_content.push("Insert a content");

        // Save the updated category document
        await theCategory.save();

        

      } catch (error) {
        console.log(error.message);
      }
    }

    res.redirect("/admin/zmr/insertTermsAndConditions");
  } catch (error) {
    console.log(error.message);
  }
}



const updateTerms_Up = async (req, res) => {
  try {
    // Template 
    // const input = req.body.input;
    // if(input) {
    //   try {
    //     res.render("admin/insertTermsAndConditionsEditor")
    //   } catch(error) {
    //     console.log(error.message)
    //   }
    // }

    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx - Update the Category - xxxxxxxxxxxxxxxxxxxxxxxxxx 
    const update_category = req.body.update_category;
    const category_id = req.body.category_id;
    const insert_category = req.body.insert_category;
    

    if (update_category) {
      try {
        let termsAndConditions = await TermsAndConditions.findById(category_id);

        // Update the category field with insertCategory
        termsAndConditions.category = insert_category;
  
        // Save the updated document
        await termsAndConditions.save();


      } catch (error) {
        console.log(error.message);
      }
    }

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx - Update the title - xxxxxxxxxxxxxxxxxxxxxxxxxx 
    const update_title = req.body.update_title;
    const insert_title = req.body.insert_title;
    const item_id = req.body.item_id;

    if (update_title) {
      try {

        // Find the category document by category_id
        let theCategory = await TermsAndConditions.findById(category_id);
        
        if (!theCategory) {
          return res.status(404).send("Category not found");
        }

        // Find the specific item within the items array
        const itemToUpdate = theCategory.items.find(item => item._id.toString() === item_id);

        if (!itemToUpdate) {
          return res.status(404).send("Item not found");
        }

        // Replace the current value with the value from insert_title
        itemToUpdate.condition_title = insert_title;

        // Save the updated category document
        await theCategory.save();

        

      } catch (error) {
        console.log(error.message);
      }
    }
    


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx - Update the content - xxxxxxxxxxxxxxxxxxxxxxxxxx
    
    const update_content = req.body.update_content;
    const original_content = req.body.original_content;
    const insert_content = req.body.insert_content;

    if (update_content) {
      try {

        // Find the category document by category_id
        let theCategory = await TermsAndConditions.findById(category_id);
        
        if (!theCategory) {
          return res.status(404).send("Category not found");
        }

        // Find the specific item within the items array
        const itemToUpdate = theCategory.items.find(item => item._id.toString() === item_id);

        if (!itemToUpdate) {
          return res.status(404).send("Item not found");
        }


        // Find the index of "hello" in condition_content array
        const index = itemToUpdate.condition_content.indexOf(original_content);

        // If "hello" is found, replace it with insert_content
        if (index !== -1) {
          itemToUpdate.condition_content[index] = insert_content;
        } else {
          console.log("String insert_content not found in condition_content array");
        }

        // Save the updated category document
        await theCategory.save();

        

      } catch (error) {
        console.log(error.message);
      }
    }

    res.redirect("/admin/zmr/insertTermsAndConditions");
  } catch (error) {
    console.log(error.message);
  }
}


const removeTerms_Up = async (req, res) => {
  try {
    // Template 
    // const input = req.body.input;
    // if(input) {
    //   try {
    //     res.render("admin/insertTermsAndConditionsEditor")
    //   } catch(error) {
    //     console.log(error.message)
    //   }
    // }

    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx - Remove the entire Category - xxxxxxxxxxxxxxxxxxxxxxxxxx 
    const remove_category = req.body.remove_category;
    const category_id = req.body.category_id;

    if (remove_category) {
      try {
        let termsAndConditions = await TermsAndConditions.findByIdAndDelete(category_id);

      } catch (error) {
        console.log(error.message);
      }
    }

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx - Update the title - xxxxxxxxxxxxxxxxxxxxxxxxxx 
    const remove_title = req.body.remove_title;
    const insert_title = req.body.insert_title;
    const item_id = req.body.item_id;

    if (remove_title) {
      try {
        // Find the category document by category_id
        let theCategory = await TermsAndConditions.findById(category_id);
        
        if (!theCategory) {
          return res.status(404).send("Category not found");
        }
    
        // Find the index of the specific item within the items array
        const itemIndex = theCategory.items.findIndex(item => item._id.toString() === item_id);
    
        if (itemIndex === -1) {
          return res.status(404).send("Item not found");
        }
    
        // Remove the item from the items array
        theCategory.items.splice(itemIndex, 1);
    
        // Save the updated category document
        await theCategory.save();
    
        console.log("Item removed successfully");
    
      } catch (error) {
        console.error(error.message);
        return res.status(500).send("Internal Server Error");
      }
    }
    


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx - Remove the content - xxxxxxxxxxxxxxxxxxxxxxxxxx
    
    const remove_content = req.body.remove_content;
const original_content = req.body.original_content;

if (remove_content) {
  try {
    // Find the category document by category_id
    let theCategory = await TermsAndConditions.findById(category_id);
    
    if (!theCategory) {
      return res.status(404).send("Category not found");
    }

    // Find the specific item within the items array
    const itemToUpdate = theCategory.items.find(item => item._id.toString() === item_id);

    if (!itemToUpdate) {
      return res.status(404).send("Item not found");
    }

    // Find the index of original_content in condition_content array
    const index = itemToUpdate.condition_content.indexOf(original_content);

    // If original_content is found, remove it from condition_content array
    if (index !== -1) {
      itemToUpdate.condition_content.splice(index, 1);
    } else {
      console.log("Original content not found in condition_content array");
    }

    // Save the updated category document
    await theCategory.save();

    console.log("Content removed successfully");

  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Internal Server Error");
  }
}


    res.redirect("/admin/zmr/insertTermsAndConditions");
  } catch (error) {
    console.log(error.message);
  }
}


// recoltare / populate data
const insertThingsLoad = async(req, res) =>{
  try {
    res.render("admin/insert")
  } catch(error) {
    console.log(error.message)
  }
}

const insertGamesUp = async(req, res) =>{
  try {
    // Initialize saved_boardgames array
    const bgg_top_100_march_2023 = [
      266192, 342942, 295947, 230802, 316554, 167791, 312484, 173346, 
      291453, 199792, 148228, 244521, 366013, 822, 224517, 350184, 374173, 
      328871, 163412, 162886, 285774, 204583, 169786, 364073, 254640, 271324, 
      84876, 68448, 233867, 199561, 336986, 242302, 9209, 237182, 357563, 183394, 
      263918, 174430, 295770, 286096, 54043, 346703, 432, 13, 324856, 41, 244522, 
      266524, 70323, 205637, 274960, 284083, 236457, 223040, 281259, 283155, 178900, 
      36218, 314491, 264055, 129622, 329839, 295895, 50, 28143, 217372, 262712, 345972, 
      14996, 305096, 345584, 246192, 284435, 350316, 182874, 231733, 12942, 365717, 341169, 
      201808, 124361, 30549, 353545, 227224, 329082, 133473, 295486, 339789, 332772, 277659, 
      192291, 167355, 317985, 364011, 279537, 355093, 220308, 293014, 251247, 161936, 233078, 
      115746, 187645, 12333, 182028, 193738, 246900, 28720, 266507, 120677, 164928, 192135, 96848, 
      324856, 175914, 256960, 247763, 3076, 102794, 170216, 521, 185343, 184267, 31260, 284378, 
      314040, 255984, 221107, 205059, 276025, 126163, 2651, 253344, 216132, 35677, 266810, 125153, 
      209010, 124742, 55690, 200680, 157354, 72125, 191189, 251661, 159675, 229853, 25613, 110327, 
      62219, 171623, 121921, 93, 264220, 321608, 37111, 225694, 155821, 163068, 122515
    ];

    const newObjectID_list = [];
    for (const game of bgg_top_100_march_2023) {
      const preCheck = await InternalBgData.findOne({ objectid: game });
      if (!preCheck) {
        newObjectID_list.push(game);
      }
    }
    // console.log("the first list is: " + newObjectID_list)
    


    // Get the input string of numbers from the form
    const inputString = req.body.objectIDs;

    // Split the input string by spaces to get an array of numbers
    const numbersArray = inputString.split(' ');

    // Convert each string number to a numeric value
    const objectID_list = numbersArray.map(numberString => parseInt(numberString));

    console.log("the input objectID_list is: " + objectID_list)


    const filtered_ObjectID_list = newObjectID_list

    console.log("the first list is: " + filtered_ObjectID_list)
    // Merge the two arrays using spread operator
    const combined_ObjectID_list = [...filtered_ObjectID_list, ...objectID_list];

    console.log("the combined_ObjectID_list  is: " + filtered_ObjectID_list)

    const xmlData = await fetchXMLData();
    if (xmlData) {
      parseString(xmlData, async (err, result) => {
        if (err) {
          console.error('Error parsing XML:', err);
          res.render('error', { error: 'Error parsing XML' });
        } else {


          // console.log(saved_boardgames);
          const extracted_saved_games = [];
          // console.log(extracted_saved_games);
          // Fetch additional data using objectid from the second API
          for (const game of combined_ObjectID_list) {
            const objectIdImport = game;
            console.log("objectIdImport:", objectIdImport);
            try {
              const response = await axios.get(`https://api.geekdo.com/xmlapi/boardgame/${objectIdImport}`);
              const secondResult = await parseXML(response.data);
      
              const yearPublishedArray = secondResult?.boardgames?.boardgame?.[0]?.yearpublished || [];
              console.log("Year Published Array:", yearPublishedArray);
              const yearPublished = Array.isArray(yearPublishedArray) && yearPublishedArray.length > 0
                ? yearPublishedArray[0] // Extract the first element of the array
                : 'N/A'; // Provide a default value if the array is empty or not an array
              console.log("Year Published:", yearPublished);
      
              const thumbnail = secondResult?.boardgames?.boardgame?.[0]?.thumbnail || 'N/A';
              console.log("Thumbnail:", thumbnail);
      
              const name = secondResult?.boardgames?.boardgame?.[0]?.name?.find((n) => n?.$.primary === 'true')?._ || 'N/A';
              console.log("Name:", name);
      
              const isNumeric = !isNaN(yearPublished); // Check if the yearPublished is numeric
      
              // Check if yearPublished is a number before attempting to save it
              const yearToSave = isNumeric ? parseInt(yearPublished) : 'N/A';
      
              // Check if objectIdImport exists in the database
              const existingGameData = await InternalBgData.findOne({ objectid: objectIdImport });
              // If the object ID does not exist, insert new data
              if (!existingGameData) {
                // Get current date
                const currentDate = new Date();
                // Extract day and hour from the current date
                const day = currentDate.getDate().toString().padStart(2, '0');

                // Generate random order number
                const randomOrder = Math.floor(100000 + Math.random() * 900000);

                // Append day and hour to the random order number
                const orderNumber = randomOrder.toString() + day;

                console.log("orderNumber : " + orderNumber);

                const newGameData = new InternalBgData({
                  order: orderNumber,
                  name: name.toString(), // Ensure name is a string
                  objectid: objectIdImport,
                  yearPublished: yearToSave, // Save the extracted numeric year or 'N/A'
                  thumbnail: thumbnail.toString(), // Ensure thumbnail is a string
                  // Add other fields as needed
                });
                await newGameData.save();
              }
      
            } catch (error) {
              console.error('Error fetching data from the second API:', error);
            }
          }



        }
      });
    } else {
      res.render('error', { error: 'No XML data fetched' });
    }

    res.redirect("/index")
  } catch(error) {
    console.log(error.message)
  }
}





module.exports = {
  insertTermsAndConditions_Load,
  insertTerms_Up,
  updateTerms_Up,
  removeTerms_Up,
  insertThingsLoad,
  insertGamesUp,
}




