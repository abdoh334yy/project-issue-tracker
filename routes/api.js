"use strict";
const { ObjectId } = require("mongodb");
const dbObject = require("../config/db.js");

module.exports = function (app) {
  const issues = dbObject.db.collection("issues");

  app.get("/api/projects", async function (req, res) {
    try {
      const result = await issues.distinct("project");
      res.json(result);
    } catch (error) {
      res.json({ error: error.message });
    }
  });
  app
    .route("/api/issues/:project")

    .get(async function (req, res) {
      const project = req.params.project;
      // const {
      //   _id,
      //   assigned_to,
      //   status_text,
      //   open,
      //   issue_title,
      //   issue_text,
      //   created_by,
      //   created_on,
      //   updated_on,
      // } = req.query;

      // buscar todas las issues de un proyecto de field project y filtrar por query params
      try {
        const result = await issues
          .find(
            {
              project,
              ...conversionQueryParameterstoFilterMongoQuery(req.query),
            },
            { projection: { project: 0 } }
          )
          .toArray();
        res.json(result);
      } catch (error) {
        res.json({ error: error.message });
      }
    })

    .post(async function (req, res) {
      const project = req.params.project;
      const { issue_title, issue_text, created_by, assigned_to, status_text } =
        req.body;
      if (
        issue_title === undefined ||
        issue_text === undefined ||
        created_by === undefined
      ) {
        res.status(400).json({ error: "required field(s) missing" });
        return;
      }
      const issueObj = {
        assigned_to: assigned_to === undefined ? "" : assigned_to,
        status_text: status_text === undefined ? "" : status_text,
        open: true,
        issue_title,
        issue_text,
        created_by,
        created_on: new Date(),
        updated_on: new Date(),
        project,
      };
      try {
        // insertar issue en issues collection y devolver el documento creado usando metodo findOneAndUpdate
        const result = await issues.findOneAndUpdate(
          { _id: new ObjectId() },
          { $set: issueObj },
          { returnDocument: "after", upsert: true }
        );
        res.status(200).json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          success: false,
        });
      }
    })

    .put(async function (req, res) {
      let project = req.params.project;
      const { _id, open, assigned_to } = req.body;
      const updateFields = {};

      if (open !== undefined) {
        updateFields.open = open === "true" ? true : false;
        updateFields.updated_on = new Date();
      }
      if (assigned_to !== undefined) {
        updateFields.assigned_to = assigned_to;
      }

      try {
        if (_id === undefined) {
          throw new Error("missing _id");
        }

        if (open === undefined && assigned_to === undefined) {
          throw new Error("no update field(s) sent");
        }

        // actualizar issues collection el issue con el id _id y los campos de updateFields

        await issues.updateOne(
          { _id: new ObjectId(String(_id)) },
          { $set: updateFields }
        );
        res.status(200).json({ result: "successfully updated", _id: _id });
      } catch (error) {
        if (error.message === "missing _id") {
          res.status(400).json({
            error: "missing _id",
          });
          return;
        }
        if (error.message === "no update field(s) sent") {
          res.status(400).json({
            error: "no update field(s) sent",
          });
          return;
        }
        res.status(500).json({ error: "could not update", _id: _id });
      }
    })

    .delete(async function (req, res) {
      let project = req.params.project;
      const { _id } = req.body;

      // borrar de issues collection el issue con el id _id
      try {
        if (_id === undefined) {
          throw new Error("missing _id");
        }
        await issues.deleteOne({ _id: new ObjectId(String(_id)) });
        res.status(200).json({ result: "successfully deleted", _id: _id });
      } catch (error) {
        if (error.message === "missing _id") {
          res.status(400).json({
            error: "missing _id",
          });
          return;
        }
        res.status(500).json({ error: "could not delete", _id: _id });
      }
    });
};

function conversionQueryParameterstoFilterMongoQuery({
  _id,
  assigned_to,
  status_text,
  open,
  issue_title,
  issue_text,
  created_by,
  created_on,
  updated_on,
}) {
  const filter = {};

  if (_id !== undefined) {
    filter._id = new ObjectId(String(_id));
  }

  if (assigned_to !== undefined) {
    filter.assigned_to = assigned_to;
  }

  if (status_text !== undefined) {
    filter.status_text = status_text;
  }

  if (open !== undefined) {
    filter.open = open === "true" ? true : false;
  }

  if (issue_title !== undefined) {
    filter.issue_title = issue_title;
  }

  if (issue_text !== undefined) {
    filter.issue_text = issue_text;
  }

  if (created_by !== undefined) {
    filter.created_by = created_by;
  }

  if (created_on !== undefined) {
    filter.created_on = new Date(created_on);
  }

  if (updated_on !== undefined) {
    filter.updated_on = new Date(updated_on);
  }

  return filter;
}
// _id: new ObjectId(String(_id)),
//     assigned_to,
//     status_text,
//     open: Boolean(open),
//     issue_title,
//     issue_text,
//     created_by,
//     created_on: new Date(created_on),
//     updated_on: new Date(updated_on),
