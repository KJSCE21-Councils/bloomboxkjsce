const firebase = require("firebase");
const admin = require("firebase-admin");
const cors = require("cors");
const path = require("path");
const url = require("url");
const session = require("express-session");
const cookieParser = require("cookie-parser");

// passport
const passport = require("passport");

// configure passport for auth
const setup = require("./passport/passport");

// express engine
const consolidate = require("consolidate");
// config
const { firebaseConfig, maliguns } = require("./configs/config");

const developmentUrl = "";

admin.initializeApp();

// express functions and middlewares
const express = require("express");
const bodyParser = require("body-parser");

// config for corresponding file upload by the candidate
const multer = require("multer");

const app = express();
const firestores = admin.firestore();

// email generator for random userid name
const randomstring = require("randomstring");

// config for hosting
const assetsPath = path.join(__dirname, "public");

// all express middlewares
// cors
app.use(cors());
app.use(express.json());

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "hello asshole",
    resave: false,
    saveUninitialized: true
  })
);
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(assetsPath));
// view engine
app.engine("ejs", consolidate.ejs);
app.set("views", "./views");
app.set("view engine", "ejs");

// facebook
app.get("/auth/facebook", (req, res, next) => {
  passport.authenticate("facebook")(req, res, next);
});

app.get("/auth/facebook/callback", (req, res, next) => {
  passport.authenticate("facebook", (err, user, info) => {
    if (err) {
      // call middleware parsing error
      return next(err);
    }
    if (!user) {
      // no user is received from the tokem
      return res.redirect("/login");
    }
    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }
      res.redirect("/Home");
    });
  })(req, res, next);
});

// github
app.get("/auth/github", (req, res, next) => {
  passport.authenticate("github")(req, res, next);
});

app.get("/auth/github/callback", (req, res, next) => {
  passport.authenticate("github", (err, user, info) => {
    if (err) {
      // call middleware parsing error
      return next(err);
    }
    if (!user) {
      // no user is received from the tokem
      return res.redirect("/login");
    }
    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }
      res.redirect("/Home");
    });
  })(req, res, next);
});

// google
app.get("/auth/google", (req, res, next) => {
  passport.authenticate("google")(req, res, next);
});

app.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      // call middleware parsing error
      return next(err);
    }
    if (!user) {
      // no user is received from the tokem
      return res.redirect("/login");
    }
    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }
      res.redirect("/Home");
    });
  })(req, res, next);
});

app.get("/Home", (req, res) => {
  console.log(req.user);
  res.render("Home", { user: req.user });
});

// check auth status
app.get("/auth", (req, res) => {
  if (req.isAuthenticated()) {
    res.json("the user is now on");
  } else {
    res.json("the user is not on");
  }
});

// logout the user
app.post("/logout", (req, res, next) => {
  req.session.destroy(msg => {
    console.log("session destroyed");
  });
  req.logOut();
  res.redirect("/Register");
});

app.get("/Register", function(req, res) {
  res.set("Cache-Control", "public, max-age=300,s-maxage=900");
  // const { host, hostname, path } = UrlCOnfig();
  // const str = path.split("/");
  return res.status(201).render("Register", {
    data: Date.now(),
    completeHostUrl: path + "/Register"
  });
});

app.post("/Register", function(req, res) {
  // res.set("Cache-Control", "public, max-age=300,s-maxage=900");
  const { Team_name, Team_Leader, cnumber } = req.body;
  const { main_email, alt_contact, alt_email, college_name } = req.body;
  const random = randomstring.generate({
    length: 15,
    charset: "alphabetic"
  });

  //   only ma to 60 registrations
  const data = {
    from: "vedang.parasnis@somaiaya.edu",
    to: "vedang.parasnis@somaiya.edu",
    subject: "Registration for Ennovate",
    text: `Please Share this code with all Team Members 
        ${random}
        <br />
        Thank You from BloomBox Team !!
    `
  };

  // create a multer storage
  const storage = multer.diskStorage({
    filename: `${Team_name} num  ${Team_Leader} ${Date.now()}`,
    destination: path.join(__dirname, "./public")
  });

  firestores
    .doc(`/Ennovate2k20/${main_email}`)
    .get()
    .then(msg => {
      if (msg.exists) {
        return res.json({ err: "please dont register agin we know you!!" });
      } else {
        firestores
          .doc(`Ennovate2k20/${Team_name}`)
          .set({
            Team_name,
            Team_Leader,
            ContactNumber: cnumber,
            Contact_Email: main_email,
            Alternate_contact: alt_contact,
            Alternate_email: alt_email,
            CollegeName: college_name
          })
          .then(addStatus => {
            console.log("user is added and a email is been send" + addStatus);
            // send email now
            const mailgun = require("mailgun-js");
            // configure mailgun first
            const mg = mailgun({
              apiKey: maliguns.apiKey,
              domain: maliguns.DOMAIN
            });
            mg.messages().send(data, function(err, body) {
              console.log(body);
              console.log("message is send with code" + random);
            });
            res.cookie("user", {
              Team_name,
              Team_Leader,
              cnumber,
              main_email
            });
            res.redirect("/login");
          })
          .catch(err => {
            console.log(err);
          });
      }
    });
});

const port = process.env.PORT || 3000;

app.get("/login", function(req, res) {
  // login with passport local
  req.session.destroy();
  res.send("login Here");
});

app.post("/Login", (req, res, next) => {
  passport.authenticate(
    "local",
    { failureRedirect: "/Login" },
    (err, user, info) => {
      //   return by attaching user to req else null as
      // success by attaching object to the body after serialize
      // extablish login session for the req.body
      req.logIn(user, err => {
        console.log(req.user);
        //if successful login by middleware
        res.cookie("user", user, { expire: new Date() + 9999 });
        return res.json(req.user);
      });
    }
  )(req, res, next);
});

app.listen(3000);