const MONGO_URL = 'mongodb://localhost:27017/socialApp'
const db = await MongoClient.connect(MONGO_URL)

const Notes = db.collection('notes')
const Users = db.collection('users')

export { Notes, Users }