const express = require("express");
const app = express();
const port = 3000;
const { buildSchema } = require("graphql");
const { graphqlHTTP } = require("express-graphql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Post = require("./models/Post");
const Comment = require("./models/Comment");
require("./connection");
const secret = "mysecret";

/// lab //////
// update post
// delete post
// get one post
// post commments : crud operation
// on getting post : comments

const schema = buildSchema(`
	type Post {
		title:String!
		content:String!
		user:User
		comments:[Comment]
	}
	type Comment {
		content:String!
		userId:User
		postId:Post
	}
	type User {
		name:String!
		email:String!
		posts:[Post]
	}
	input UserInput {
		name:String!
		email:String!
		password:String!
	}
	type Query {
		test:String
		usersGetAll:[User!]!
		userGetOne(id:ID!):User!
		getMyPosts(token:String!):[Post!]!
		getOnepost(token:String!, _id:ID!):Post!
		getMyComments(token:String!,_id:ID!):[Comment!]!
		getOnecomment(token:String!,_id:ID!, c_id:ID!):Comment!
		
	}
	type Mutation {
		userCreate(input:UserInput):User
		userLogin(email:String!,password:String!):String
		postCreate(title:String!,content:String!,token:String!):String
		postUpdate(_id:ID!, title:String!,content:String!,token:String!):String
		postDelete(_id:ID!, token:String!):String
		commentCreate(token:String!,content:String!,_id:ID!):String
		commentUpdate(token:String!,content:String!, _id:ID!, c_id:ID!):String
    commentDelete(token:String!, _id:ID!, c_id:ID!):String
	}
`);
const userQueries = {
  test: async () => {
    const user = await User.find().populate("posts");
    console.log(JSON.stringify(user, null, 2));
    return "test";
  },
  usersGetAll: async () => {
    const users = await User.find();
    return users;
  },
  userGetOne: async ({ id }) => {
    const user = await User.findById(id).populate("posts");
    console.log("🚀 ~ file: server.js:55 ~ userGetOne: ~ user", user);
    return user;
  },
};
const userMutations = {
  userCreate: async ({ input }) => {
    const { name, email, password } = input;
    const hashedPassword = await bcrypt.hash(password, 10);
    const UserCreated = new User({ name, email, password: hashedPassword });
    console.log(hashedPassword);
    await UserCreated.save();
    return {
      name,
      email,
    };
  },
  userLogin: async ({ email, password }) => {
    const user = await User.findOne({ email });
    const isValidPassword = await bcrypt.compare(password, user?.password);
    if (!user || !isValidPassword) throw new Error("Invalid credentials");
    console.log("user", user);
    const token = jwt.sign({ userId: user._id }, secret);
    return token;
  },
};
const auth = async (token) => {
  const { userId } = jwt.verify(token, secret);
  const user = await User.findById(userId);
  return user;
};
const postQueries = {
  getMyPosts: async ({ token }) => {
    const user = await auth(token);
    const posts = await Post.find({ userId: user._id }).populate("userId");
    debugger;
    console.log("posts", posts);
    return posts.map((post) => ({ ...post._doc, user: post.userId }));
  },
  getOnepost: async ({ token, _id }) => {
    const user = await auth(token);
    const post = await Post.findOne({ userId: user._id, _id: _id }).populate(
      "comments"
    );
    console.log("posts", post);
    return post;
  },
};
const postMutations = {
  postCreate: async ({ title, content, token }) => {
    const user = await auth(token);
    const post = new Post({ title, content, userId: user._id });
    console.log("user", user);
    await post.save();
    return "Post Created Suceesfully";
  },
  postUpdate: async ({ _id, title, content, token }) => {
    const user = await auth(token);
    const postUpdated = await Post.findByIdAndUpdate(_id, { title, content });
    console.log("Updated post", postUpdated);
    return "Post Updated Suceesfully";
  },
  postDelete: async ({ _id, token }) => {
    const user = await auth(token);
    const postDeleted = await Post.findByIdAndDelete(_id);
    console.log("Deleted post", postDeleted);
    return "Post Deleted Suceesfully";
  },
};

const commentQueries = {
  getMyComments: async ({ token, _id }) => {
    const user = await auth(token);
    const comments = await Comment.find({
      userId: user.id,
      postId: _id,
    }).populate("postId userId");
    debugger;
    console.log("comments", comments);
    return comments;
  },
  getOnecomment: async ({ token, _id, c_id }) => {
    const user = await auth(token);
    const comment = await Comment.findOne({
      userId: user.id,
      postId: _id,
      _id: c_id,
    }).populate("postId userId");
    console.log("comments", comment);
    if (!comment) {
      return "not found";
    }
    return comment;
  },
};

const commentMutations = {
  commentCreate: async ({ token, _id, content }) => {
    const user = await auth(token);
    const comment = new Comment({ userId: user._id, content, postId: _id });
    console.log("commentcreated", comment);
    await comment.save();
    return "Comment Created Suceesfully";
  },
  commentUpdate: async ({ token, _id, c_id, content }) => {
    const user = await auth(token);
    const commentUpdated = await Comment.findByIdAndUpdate(
      {
        userId: user.id,
        postId: _id,
        _id: c_id,
      },
      { content }
    );
    console.log("Updated comment", commentUpdated);
    return "Comment Updated Suceesfully";
  },
  commentDelete: async ({ token, _id, c_id }) => {
    const user = await auth(token);
    const commentDeleted = await Comment.findByIdAndDelete({
      userId: user.id,
      postId: _id,
      _id: c_id,
    });
    console.log("Deleted comment", commentDeleted);
    return "Comment Deleted Suceesfully";
  },
};
const resolvers = {
  ...userQueries,
  ...userMutations,
  ...postQueries,
  ...postMutations,
  ...commentQueries,
  ...commentMutations,
};
app.use(
  "/graphql",
  graphqlHTTP({ schema, rootValue: resolvers, graphiql: true })
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
