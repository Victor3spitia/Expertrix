const config = ({
  db: {
    /* don't expose password or any sensitive info, done only for demo */
    host: "localhost",
    user: "root",
    password: "",
    database: "restapitest123",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  listPerPage: 10,
});



module.exports = config;
