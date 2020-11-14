const crypto = require('crypto');
const {createRemoteFileNode} = require("gatsby-source-filesystem")
const fetchSheet = require('./lib/fetchSheet.js').default;
const { isString, startsWith } = require("lodash");
const {GoogleDrive} = require('./lib/googleDrive/GoogleDrive.js');

exports.onCreateNode = async ({
  node,
  actions: { createNode },
  store,
  cache,
  createNodeId,
  reporter
},
{ credentials, perRowDownloadInterval, perCellDownloadInterval }) => {
  if (
    node.internal.type !== 'googleSheet' &&
    node.internal.type.startsWith('google') &&
    node.internal.type.endsWith('Sheet') &&
    node.internal.content)
  {
    const row = JSON.parse(node.internal.content);

    const filesCells = Object.entries(row).filter(([name, data]) => data && isString(data) && startsWith(data, 'https://drive.google.com/file/d/'));

    setTimeout(async () => {
      const drive = new GoogleDrive();
      await drive.useServiceAccountAuth(credentials);

      node.images = [];

      filesCells.forEach(async ([name, data], index) => {
        setTimeout(async () => {
          const fileId = data.replace('https://drive.google.com/file/d/', '').replace('/view?usp=sharing', '');

          let fileNode;
          try {
            fileNode = await createRemoteFileNode({
              url: encodeURI(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`),
              parentNodeId: node.id,
              createNode,
              createNodeId,
              cache,
              store,
              name: "google-drive-image-" + createNodeId(fileId),
              httpHeaders: { Authorization: drive.getBearerToken() },
              reporter,
            })
          } catch (e) {
            console.log(e);
          }
    
          node.images.push(fileNode.id);
        }, index * perCellDownloadInterval);
      });
    }, node.index * perRowDownloadInterval);
  }
};

exports.sourceNodes = async (
  {
    actions: { createNode },
  },
  { spreadsheetId, includedWorksheets, type, credentials, apiKey },
) => {
  console.log('Fetching Google Sheet', fetchSheet, spreadsheetId);

  const sheets = await fetchSheet(spreadsheetId, includedWorksheets, type, credentials, apiKey);

  Object.entries(sheets).forEach(([name, data]) => {
    if (Array.isArray(data)) {
      data.forEach(async (row, index) => {
        name = name.replace(/[\W_]+/g, '');

        createNode(
          Object.assign(row, {
            parent: '__SOURCE__',
            children: [],
            index,
            internal: {
              type: `google${name.charAt(0).toUpperCase()}${name.slice(
                1,
              )}Sheet`,
              content: row ? JSON.stringify(row) : undefined,
              contentDigest: crypto
                .createHash('md5')
                .update(JSON.stringify(row))
                .digest('hex'),
            },
          }),
        );
      });
    }
  });
  createNode(
    Object.assign(sheets, {
      parent: '__SOURCE__',
      children: [],
      internal: {
        type: 'googleSheet',
        contentDigest: crypto
          .createHash('md5')
          .update(JSON.stringify(sheets))
          .digest('hex'),
      },
    }),
  );
};