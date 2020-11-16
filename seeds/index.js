
const mongoose=require('mongoose');
const cities=require('./cities');
const {places,descriptors}=require('./seedHelpers');
const Campground=require('../models/campground');

mongoose.connect('mongodb://localhost:27017/yelp-camp',{
    useNewUrlParser:true,
    useCreateIndex:true,
    useUnifiedTopology:true
});

const db=mongoose.connection;
db.on('error',console.error.bind(console,'Connection error:'));
db.once('open',()=>{
    console.log('Database Connected');
});

const sample=array=>array[Math.floor(Math.random()*array.length)];


const seedDB=async ()=>{
    await Campground.deleteMany({});
    for(let i=0;i<20;i++){
        const random1000=Math.floor(Math.random()*1000);
        const price=Math.floor(Math.random()*20)+10;
    const camp=new Campground({
        author:'5faa4525562c2a209c3bf8b9',
        location:`${cities[random1000].city},${cities[random1000].state}`,
       title:`${sample(descriptors)} ${sample(places)}`,
       
        description:'Campers enjoy a wide variety of traditional adventure programs from swimming and hiking to Rambo and rock climbing. With campers from across the United States, Camp Cherokee helps campers to appreciate the diversity of other cultures and become a part of a global community. Cabin life also plays an important role in teaching campers to be self reliant, cooperate with others and learn to make decisions while they are away from home.',
        price,
        geometry: { 
            type: 'Point', 
            coordinates: [
            cities[random1000].longitude,
            cities[random1000].latitude
            ]
    },
    images: [
        {
         
          url: 'https://res.cloudinary.com/dmgyytz2o/image/upload/v1605261485/YelpCamp/wk973twxznfzoalpcl1j.jpg',
          filename: 'YelpCamp/wk973twxznfzoalpcl1j'
        }
      ],
    })
    await camp.save();
}
}
seedDB().then(()=>{
    mongoose.connection.close();
})