require('dotenv').config()
const Models = require('../../mongo'),
    jwt = require("jsonwebtoken");

verifyToken = (req, res, next) => {
    let token =  req.headers.authorization && req.headers.authorization.split(' ')[1];
//   let token = req.headers["x-access-token"];
    if (!token) {
        return res.status(403).send({ message: "No authorization token provided!" });
    }
    jwt.verify(token,
        process.env.SECRET || 'crime_guard_token_secret',
        (err, decoded) => {
            if (err) {
            return res.status(401).send({
                message: "Unauthorized!",
            });
            }
            req.userId = decoded.id;
            next();
        });
};
isAdmin = (req, res, next) => {
    Models.User.findById(req.userId).exec()
    .then(user => {
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
  
      if (user.role === "admin") {
        next();
      } else {
        return res.status(403).send({ message: "Require Admin Role!" });
      }
    })
    .catch(err => {
      res.status(500).send({ message: err.message || "Some error occurred while retrieving user" });
    });
  };
module.exports = {
    verifyToken,
    isAdmin
}