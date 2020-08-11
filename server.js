const express = require("express"),
    app = express(),
    port = process.env.PORT || 5000,
    cors = require("cors");
const fetch = require('node-fetch');
const { response } = require("express");
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config()
const bodyParser = require('body-parser');

app.use(bodyParser.json());

const ProjectSchema = new mongoose.Schema(
    {
        projectName: {
            type: String,
            unique: false,
            required: true,
        },

        description: {
            type: String,
            unique: false,
            required: false,
        },

        dateCreated: {
            type: Date,
            unique: false,
            required: true,
        },

        datePushed: {
            type: Date,
            unique: false,
            required: false,
        },
        githubURL: {
            type: String,
            unique: true,
            required: true,
        },
    },
    { timestamps: true },
);

const Project = mongoose.model('Project', ProjectSchema);

function connectDb() {
    return mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true });
}

connectDb().catch(err => console.log(err));

const db = mongoose.connection;

db.on('error', (error) => console.error(error))
db.once('open', () => console.log('connected to database'))

app.use(cors());
app.listen(port, () => console.log(`Backend server live on ${port}.`));

app.get("/", (req, res) => {
    res.send({ message: "We did it!" });
});

app.get("/github", async function (req, res, next) {
    const projects = await Project.find();
    return res.send(projects);
});

app.get('/seed', async function (req, res) {
    mongoose.connection.db.dropCollection("projects", (err, res) => {
        if (err) {
            console.log("Could not drop database.\nMessage: " + err.message);
        } else {
            console.log("Dropped database");
        }
    })

    function getData() {
        return fetch('https://api.github.com/users/sstawiarski/repos');
    }

    const processData = async () => {
        const github = await getData();
        const responseData = await github.json();

        responseData.forEach(item => {
            let name = item.name;
            let desc = item.description;
            let created = new Date(item.created_at);
            let pushed = new Date(item.pushed_at);
            let url = item.html_url;
            const project = new Project({
                projectName: name,
                description: desc,
                dateCreated: created,
                datePushed: pushed,
                githubURL: url
            });

            try {
                project.save();
            } catch {
                res.status(400).json({ message: "Error seeding data" });
                return;
            }
        })

        res.status(201).json({ message: "Seeded data" });
    }

    processData();

});

app.post("/sendEmail", (req, res) => {
    let transport = nodemailer.createTransport({
        host: 'smtp-relay.sendinblue.com',
        port: 587,
        auth: {
           user: process.env.SMTP_USER,
           pass: process.env.SMTP_PASS
        }
    });
    console.log(req.body);
    const formInfo = req.body;

    const message = {
        from: formInfo.email,
        to: "contact@shawnstawiarski.com",
        subject: `Website contact from: ${formInfo.firstName} ${formInfo.lastName}`,
        text: formInfo.message,
        html: `<p>${formInfo.message}</p>`
    };

    transport.sendMail(message, function(err, info) {
        if (err) {
          console.log(err)
        } else {
          console.log(info);
        }
    });

});