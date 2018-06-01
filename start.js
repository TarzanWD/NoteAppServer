import {MongoClient, ObjectId} from 'mongodb'
import express from 'express'
import bodyParser from 'body-parser'
import {graphqlExpress, graphiqlExpress} from 'apollo-server-express'
import {makeExecutableSchema} from 'graphql-tools'
import cors from 'cors'
import mongoose from 'mongoose'
import typeDefs from './data/types'
import md5 from 'js-md5'
const URL = 'http://localhost'
const PORT = 6080
const MONGO_URL = 'mongodb://localhost:27017/socialApp'

export const start = async () => {
  try {
    const db = await MongoClient.connect(MONGO_URL)
    
    const Notes = db.collection('notes')
    const Users = db.collection('users')

    const resolvers = {
        Query: {
          note: async (root, {_id}) => {
            return await Notes.findOne(ObjectId(_id))
          },
          notes: async () => {
            return await Notes.find({}).toArray()
          },
          user: async (root, {_id}) => {
            return await Users.findOne(ObjectId(_id))
          },
          users: async (root, {_id}) => {
            return await Users.find({}).toArray()
          },
          login: async (root, { username, pass }) => {
            const user = await Users.findOne({
              username: username
            })
            let res = {
              _id: '',
              token: '',
              logged: false
            }
            
            if (user !== null && user.pass === pass) {
              return res = {
                _id: user._id,
                token: 'abcdef',
                logged: true
              }
            } else {
              return res
            }
          }
        },
        Mutation: {
          createNote: async (root, args) => {
            const note = {
              text: args.text,
              date: new Date(),
              user: args.userId,
              likes: []
            }
            const res = await Notes.insert(note)
            return await Notes.findOne({_id: res.insertedIds[0]})
          },
          createUser: async (root, args) => {
            const user = {
              fname: args.fname,
              lname: args.lname,
              age: args.age,
              pass: args.pass
            }
            const res = await Users.insert(user)
            return await Users.findOne({ _id: res.insertedIds[0]})
          },
          likeNote: async (root, args) => {
            const note = await Notes.findOne({
              _id: ObjectId(args.noteId)
            })
            let isIn = false
            console.log(note.likes.length)
            for(let i = 0; i < note.likes.length; i++) {
              if(ObjectId(note.likes[i]).toString() == ObjectId(args.userId).toString()) {
                isIn = true
              }
            }
            if ( isIn == false){
              await Notes.update({
                _id: ObjectId(args.noteId)
              },
              {
                $push: { 
                  likes: ObjectId(args.userId)
                }
              })
              return await Notes.findOne({ 
                _id: ObjectId(args.noteId)
              })
            } else {
              await Notes.update(
              {},
              {
                $pull: { 
                  likes: ObjectId(args.userId)
                }
              })
              return await Notes.findOne({ 
                _id: ObjectId(args.noteId)
              })
            }
          }
        },
        Note: {
          likes: async ({ likes }) => {
            let res = []
            for(let i = 0; i < likes.length; i++) {
              res.push(
                Users.findOne({
                  _id: ObjectId(likes[i])
                })
                // najít lepší řešení, tohle zatěžuje zbytečne DB
              )
            }
            return res
          },
          user: async({user}) => {
            return await Users.findOne({_id: ObjectId(user)})
          }
        },
        User: {
          notes: async ({_id}) => {
            const res = await Notes.find({}).toArray()
            return res.filter(note => note.user == _id)
          }
        }
    }

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    })

    const app = express()

    app.use(cors())

    app.use('/graphql', bodyParser.json(), graphqlExpress({schema}))

    const homePath = '/graphiql'

    app.use(homePath, graphiqlExpress({
      endpointURL: '/graphql'
    }))

    app.listen(PORT, () => {
      console.log(`Visit ${URL}:${PORT}${homePath}`)
    })

  } catch (e) {
    console.log(e)
  } 

}