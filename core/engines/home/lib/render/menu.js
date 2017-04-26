const {
  WIDTH,
  HEIGHT,

  SERVER_WIDTH,
  SERVER_HEIGHT,

  WALKTHROUGH_WIDTH,
  WALKTHROUGH_HEIGHT,
} = require('../constants/menu');

const SERVERS_PER_PAGE = 8;

const closeBoxImg = require('../img/close-box');
const closeBoxImgSrc = 'data:image/svg+xml;base64,' + btoa(closeBoxImg);
const serverPlusImg = require('../img/server-plus');
const serverPlusImgSrc = 'data:image/svg+xml;base64,' + btoa(serverPlusImg);
const chevronLeftImg = require('../img/chevron-left');
const chevronLeftImgSrc = 'data:image/svg+xml;base64,' + btoa(chevronLeftImg);
const lanConnectImg = require('../img/lan-connect');
const lanConnectImgSrc = 'data:image/svg+xml;base64,' + btoa(lanConnectImg);
const lanDisconnectImg = require('../img/lan-disconnect');
const lanDisconnectImgSrc = 'data:image/svg+xml;base64,' + btoa(lanDisconnectImg);
const mouseImg = require('../img/mouse');
const mouseImgSrc = 'data:image/svg+xml;base64,' + btoa(mouseImg);
const upImg = require('../img/up');
const downImg = require('../img/down');

const makeRenderer = ({creatureUtils}) => {

const getHomeMenuSrc = ({page, remoteServers, localServers, inputText, inputIndex, inputValue, loading, vrMode, focusType, flags}) => {
  const pageSpec = (() => {
    const split = page.split(':');
    const name = split[0];
    const args = split.slice(1);
    return {
      name,
      args,
    };
  })();

  const {name} = pageSpec;
  if (name === 'tutorial') {
    const {args} = pageSpec;
    const pageIndex = parseInt(args[0], 10);

    return getTutorialPageSrc(pageIndex, vrMode, flags);
  } else if (name === 'menu') {
    return getMenuPageSrc(flags);
  } else if (name === 'remoteServers') {
    const {args} = pageSpec;
    const pageIndex = parseInt(args[0], 10);

    return getRemoteServersSrc(remoteServers, pageIndex, loading);
  } else if (name === 'localServers') {
    const {args} = pageSpec;
    const pageIndex = parseInt(args[0], 10);

    return getLocalServersSrc(localServers, pageIndex, loading);
  } else if (name === 'createServer') {
    return getCreateServerSrc(inputText, inputIndex, inputValue, focusType);
  } else {
    return '';
  }
};

const getTutorialPageSrc = (pageIndex, vrMode, flags) => {
  const keyboardVrMode = vrMode === null || vrMode === 'keyboard';

  const content = (() => {
    switch (pageIndex) {
      case 0: return `\
        <div style="display: flex; padding: 0 50px; justify-content: center; align-items: center; flex-direction: column; flex-grow: 1;">
          <div style="display: flex; width: 100%; height: 100px; margin-top: auto; justify-content: center; align-items: center;">
            <!-- <div style="width: 200px;"></div>
            <div style="display: flex; flex-grow: 1;">
              <a style="display: flex; width: 90px; height: 100px; justify-content: center; align-items: center;" onclick="tutorial:setPage:1">
                <div style="display: flex; width: 10px; height: 10px; background-color: #000;"></div>
              </a>
              <a style="display: flex; width: 90px; height: 100px; justify-content: center; align-items: center;" onclick="tutorial:setPage:2">
                <div style="display: flex; width: 10px; height: 10px; background-color: #CCC;"></div>
              </a>
              <a style="display: flex; width: 90px; height: 100px; justify-content: center; align-items: center;" onclick="tutorial:setPage:3">
                <div style="display: flex; width: 10px; height: 10px; background-color: #CCC;"></div>
              </a>
              <a style="display: flex; width: 90px; height: 100px; justify-content: center; align-items: center;" onclick="tutorial:setPage:4">
                <div style="display: flex; width: 10px; height: 10px; background-color: #CCC;"></div>
              </a>
              <a style="display: flex; width: 90px; height: 100px; justify-content: center; align-items: center;" onclick="tutorial:setPage:5">
                <div style="display: flex; width: 10px; height: 10px; background-color: #CCC;"></div>
              </a>
            </div>
            <div style="display: flex; width: 200px;"> -->
              <a style="display: flex; margin-left: auto; padding: 10px 15px; border: 2px solid; font-size: 20px; font-weight: 400; text-decoration: none;" onclick="home:next">Next: Modules</a>
            <!-- </div> -->
          </div>
        </div>
      `;
      case 1: return `\
       <div style="display: flex; padding: 0 50px; justify-content: center; align-items: center; flex-direction: column; flex-grow: 1;">
          <div style="display: flex; width: 100%; height: 100px; margin-top: auto; justify-content: center; align-items: center;">
            <!-- <div style="font-size: 30px; font-weight: 400;">Discover your superpowers</div>
            <div style="display: flex;">
              <img src="" width="256" height="128" style="margin: 10px 0; margin-right: 28px;" />
              <img src="" width="256" height="128" style="margin: 10px 0;" />
            </div>
            <div style="width: 540px; margin-bottom: auto; font-size: 15px; font-weight: 400; flex-grow: 1">
              <p>This screen is the <b>MENU</b>. The menu has tools to edit your VR world, move between worlds, and change settings. It's showing you this tutorial.</p>
              <p>To <b>OPEN</b> or <b>CLOSE</b> the menu, press the <b>MENU</b> the <b>PAD${keyboardVrMode ? ' (E key)' : ''}</b> on your controller.</p>
              <p>To <b>TELEPORT</b> around the world, <b>HOLD</b> the <b>PAD${keyboardVrMode ? ' (Q key)' : ''}</b> on to target and <b>RELEASE</b> to go there. Use your finger to adjust how far you'll teleport.</p>
              <p style="margin-bottom: 0; font-size: 18px;">
                <i>
                  <i>To continue, click the <b>NEXT BUTTON</b> with your <b>TRIGGER</b>:</i>
                </i>
              </p>
              </p>
            </div>
            <div style="display: flex; width: 100%;"> -->
  <a style="display: flex; margin-left: auto; padding: 10px 15px; border: 2px solid; font-size: 20px; font-weight: 400; text-decoration: none;" onclick="home:next">Next: Servers</a>
            <!-- </div> -->
          </div>
        </div>
      `;
      case 2: return `\
        <div style="display: flex; padding: 0 50px; justify-content: center; align-items: center; flex-direction: column; flex-grow: 1;">
          <div style="display: flex; width: 100%; height: 100px; margin-top: auto; justify-content: center; align-items: center;">
            <!-- <div style="font-size: 30px; font-weight: 400;">The cake is real</div>
            <img src="" width="256" height="128" style="margin: 10px 0;" />
            <div style="width: 540px; margin-bottom: auto; font-size: 15px; font-weight: 400; flex-grow: 1">
              <p>In Zeo VR, your world is made up of <i>modules</i>. Modules are objects you can add to the world.</p>
              <p>For example, here is a <b>CAKE MODULE</b>:</p>
              <div style="width: 100px; height: 100px;"></div>
              <p style="margin-bottom: 0; font-size: 18px;">
                <i>
                  To continue, <b>ADD</b> the cake to the world and <b>EAT</b> it.<br/>
                  Grab a slice by holding the <b>GRIP (F key)</b> and move it to your mouth.<br/>
                </i>
              </p>
            </div>
            <div style="display: flex; width: 100%;"> -->
  <a style="display: flex; margin-left: auto; padding: 10px 15px; border: 2px solid; font-size: 20px; font-weight: 400; text-decoration: none;" onclick="home:next">Next: Multiplayer</a>
            <!-- </div> -->
          </div>
        </div>
      `;
      case 3: return `\
        <div style="display: flex; padding: 0 50px; justify-content: center; align-items: center; flex-direction: column; flex-grow: 1;">
          <div style="display: flex; width: 100%; height: 100px; margin-top: auto; justify-content: center; align-items: center;">
            <!-- <div style="font-size: 30px; font-weight: 400;">It's dangerous to go alone!</div>
            <img src="" width="256" height="128" style="margin: 10px 0;" />
            <div style="width: 540px; margin-bottom: auto; font-size: 15px; font-weight: 400; flex-grow: 1">
              <p>Zeo VR lets you connect to multiplayer world servers.</p>
              <p>Look at the <b>LINK ORBS</b> around you. Each Link Orb is a server you can join. To connect to a server, <b>POINT</b> at it and click your <b>TRIGGER</b>.</p>
              <p>Some servers are <b>LOCKED</b> until you get permission from the owner. Contact info for each server is written above the server, but you can <i>sneak a peek</i> through the orb.</p>
              <p style="margin-bottom: 0; font-size: 18px;">
                <i>
                  To <b>LEARN</b> how to code your own worlds, read the <a onclick="home:apiDocs"><b>API Docs</b></a>.<br/>
                  To <b>HIDE</b> the tutorial, click the <b>NEXT BUTTON</b>.<br/>
                </i>
              </p>
            </div>
            <div style="display: flex; width: 100%;"> -->
  <a style="display: flex; margin-left: auto; padding: 10px 15px; border: 2px solid; font-size: 20px; font-weight: 400; text-decoration: none;" onclick="home:next">Next: Host your own</a>
            <!-- </div> -->
          </div>
        </div>
      `;
      case 4: return `\
        <div style="display: flex; padding: 0 50px; justify-content: center; align-items: center; flex-direction: column; flex-grow: 1;">
          <div style="display: flex; width: 100%; height: 100px; margin-top: auto; justify-content: center; align-items: center;">
            <!-- <div style="font-size: 30px; font-weight: 400;">It's dangerous to go alone!</div>
            <img src="" width="256" height="128" style="margin: 10px 0;" />
            <div style="width: 540px; margin-bottom: auto; font-size: 15px; font-weight: 400; flex-grow: 1">
              <p>Zeo VR lets you connect to multiplayer world servers.</p>
              <p>Look at the <b>LINK ORBS</b> around you. Each Link Orb is a server you can join. To connect to a server, <b>POINT</b> at it and click your <b>TRIGGER</b>.</p>
              <p>Some servers are <b>LOCKED</b> until you get permission from the owner. Contact info for each server is written above the server, but you can <i>sneak a peek</i> through the orb.</p>
              <p style="margin-bottom: 0; font-size: 18px;">
                <i>
                  To <b>LEARN</b> how to code your own worlds, read the <a onclick="home:apiDocs"><b>API Docs</b></a>.<br/>
                  To <b>HIDE</b> the tutorial, click the <b>NEXT BUTTON</b>.<br/>
                </i>
              </p>
            </div>
            <div style="display: flex; width: 100%;"> -->
  <a style="display: flex; margin-left: auto; padding: 10px 15px; border: 2px solid; font-size: 20px; font-weight: 400; text-decoration: none;" onclick="home:next">Go to main menu</a>
            <!-- </div> -->
          </div>
        </div>
      `;
      default: return '';
    }
  })();
  const headerText = (() => {
    switch (pageIndex) {
      case 0: return 'Introduction 1: Controls';
      case 1: return 'Introduction 2: Modules';
      case 2: return 'Introduction 3: Multiplayer';
      case 3: return 'Introduction 4: Host your own';
      case 4: return 'Introduction 5: Making modules';
      default: return '';
    }
  })();

  return getHeaderWrappedSrc(content, headerText, {back: true});
};

const getMenuPageSrc = flags => {
  const videos = [
    {},
    {},
    {},
    {},
    {},
  ];

  return getHeaderWrappedSrc(`\
    <div style="display: flex; flex-direction: column; flex-grow: 1;">
      <div style="display: flex; margin-bottom: auto; flex-direction: column;">
        ${videos.map((video, index) =>
          `<a style="display: flex; padding: 10px 0; margin: 0 50px; text-decoration: none; align-items: center;" onclick="home:tutorial:${index}">
             <div style="background-color: #EEE; height: 60px; width: ${60 * 1.5}px; margin-right: 20px;"></div>
             <div style="display: flex; height: 60px; font-size: 24px; font-weight: 400;">Introduction ${index + 1}: Some video name</div>
          </a>`
        ).join('\n')}
      </div>
      <div style="display: flex; height: 100px; padding: 0 50px; justify-content: center; align-items: center;">
        <a style="display: flex; margin-left: auto; padding: 10px 15px; border: 2px solid; font-size: 20px; font-weight: 400; text-decoration: none;" onclick="home:next">Skip tutorial</a>
      </div>
      ${flags.localServers ?
        `<!-- <a style="display: flex; width: 200px; height: 200px; margin-right: 30px; border: 1px solid; border-radius: 5px; font-weight: 400; text-decoration: none; flex-direction: column; justify-content: center; align-items: center;" onclick="home:localServers">
          <div style="margin-bottom: 15px; font-size: 24px;">Local servers</div>
          <img src="${serverPlusImgSrc}" width="100" height="100" />
        </a> -->`
      :
        ''
      }
    </div>
  `, 'Introduction videos');
};

const getHeaderWrappedSrc = (content, headerText, {back = false} = {}) => `\
  <div style="display: flex; width: ${WIDTH}px; height: ${HEIGHT}px; flex-direction: column;">
    <div style="display: flex; height: 100px; justify-content: center; align-items: center;">
      ${back ?
        `<a style="display: flex; width: 100px; height: 100px; justify-content: center; align-items: center;" onclick="home:back">
          <img src="${chevronLeftImgSrc}" width="80" height="80" />
        </a>`
      :
        `<div style="width: 50px; height: 100px;"></div>`
      }
      <div style="margin-right: auto; font-size: 32px; font-weight: 400;">${headerText}</div>
    </div>
    ${content}
  </div>
`;

const getServerSrc = (server, index, prefix) => {
  const {worldname, url, running, users} = server;

  return `\
    <a style="display: flex; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #EEE; text-decoration: none;" onclick="${prefix}:${index}">
      <img src="${creatureUtils.makeStaticCreature('server:' + worldname)}" width="80" height="80" style="display: flex; width: 80px; height: 80px; margin-right: 10px; image-rendering: -moz-crisp-edges; image-rendering: pixelated;" />
      <div style="display: flex; margin-right: auto; padding: 5px; flex-direction: column;">
        <div style="font-size: 20px; font-weight: 600;">${worldname}</div>
        <div style="font-size: 13px; font-weight: 400;">
          ${url ?
            `<i>${url}</i>`
          :
            ''
          }
        </div>
      </div>
      <div style="width: 300px; padding: 5px; box-sizing: border-box;">
        ${users.length > 0 ?
          users.map(user =>
            `<div style="display: inline-block; margin-right: 5px; padding: 2px 10px; background-color: #F7F7F7; font-size: 13px; font-weight: 400;">${user}</div>`
          ).join('')
        :
          'No users'
        }
      </div>
      <div style="display: flex; width: 80px; height: 80px; justify-content: center; align-items: center;">
        <img src="${running ? lanConnectImgSrc : lanDisconnectImgSrc}" width="24px" height="24px" />
      </div>
    </a>
  `;
};
const getServersSrc = (servers, loading, prefix) => {
  if (!loading) {
    if (servers.length > 0) {
      return `<div style="display: flex; width: ${WIDTH - 250}px; height: ${HEIGHT - 100}px; padding: 0 30px; flex-direction: column; box-sizing: border-box;">
        ${servers.map((server, index) => getServerSrc(server, index, prefix)).join('')}
      </div>`;
    } else {
      return `<div style="padding: 0 30px; font-size: 30px;">No servers</div>`;
    }
  } else {
    return `<div style="padding: 0 30px; font-size: 30px;">Loading...</div>`;
  }
};

const getRemoteServersSrc = (servers, pageIndex, loading) => {
  const leftSrc = (() => {
    return `\
      <div style="display: flex; margin-right: auto; flex-direction: column;">
        <div style="display: flex; height: 100px; justify-content: center; align-items: center;">
          <a style="display: block; width: 100px;" onclick="home:menu">
            <img src="${chevronLeftImgSrc}" width="80" height="80" />
          </a>
          <div style="margin-right: auto; font-size: 40px;">Remote servers</div>
        </div>
        ${getServersSrc(servers.slice(pageIndex * SERVERS_PER_PAGE, (pageIndex + 1) * SERVERS_PER_PAGE), loading, 'remoteServer')}
      </div>
    `;
  })();
  const rightSrc = (() => {
    const showUp = pageIndex > 0;
    const showDown = servers.length >= ((pageIndex + 1) * SERVERS_PER_PAGE);

    return `\
      <div style="display: flex; width: 250px; height: inherit; flex-direction: column; box-sizing: border-box;">
        <a style="position: relative; display: flex; margin: 0 30px; margin-top: 20px; margin-bottom: auto; border: 1px solid; border-radius: 5px; text-decoration: none; justify-content: center; align-items: center; ${showUp ? '' : 'visibility: hidden;'}" onclick="servers:up">
          ${upImg}
        </a>
        <a style="position: relative; display: flex; margin: 0 30px; margin-bottom: 20px; border: 1px solid; border-radius: 5px; text-decoration: none; justify-content: center; align-items: center; ${showDown ? '' : 'visibility: hidden;'}" onclick="servers:down">
          ${downImg}
        </a>
      </div>
    `;
  })();

  return `\
    <div style="display: flex; height: ${HEIGHT}px;">
      ${leftSrc}
      ${rightSrc}
    </div>
  `;
};

const getLocalServersSrc = (servers, pageIndex, loading) => {
  const leftSrc = (() => {
    return `\
      <div style="display: flex; margin-right: auto; flex-direction: column;">
        <div style="display: flex; height: 100px; justify-content: center; align-items: center;">
          <a style="display: block; width: 100px;" onclick="home:menu">
            <img src="${chevronLeftIconSrc}" width="80" height="80" />
          </a>
          <div style="margin-right: auto; font-size: 40px;">Local servers</div>
        </div>
        ${getServersSrc(servers.slice(pageIndex * SERVERS_PER_PAGE, (pageIndex + 1) * SERVERS_PER_PAGE), loading, 'localServer')}
      </div>
    `;
  })();
  const rightSrc = (() => {
    const showUp = pageIndex > 0;
    const showDown = servers.length >= ((pageIndex + 1) * SERVERS_PER_PAGE);

    return `\
      <div style="display: flex; width: 250px; height: inherit; flex-direction: column; box-sizing: border-box;">
        <a style="display: flex; margin: 30px; padding: 20px 0; border: 1px solid; border-radius: 5px; font-weight: 400; text-decoration: none; flex-direction: column; justify-content: center; align-items: center;" onclick="localServers:createServer">
          <div style="font-size: 24px;">Create server</div>
          <img src="${serverPlusImgSrc}" width="80" height="80" />
        </a>
        <a style="position: relative; display: flex; margin: 0 30px; margin-bottom: auto; border: 1px solid; border-radius: 5px; text-decoration: none; justify-content: center; align-items: center; ${showUp ? '' : 'visibility: hidden;'}" onclick="servers:up">
          ${upImg}
        </a>
        <a style="position: relative; display: flex; margin: 0 30px; margin-bottom: 20px; border: 1px solid; border-radius: 5px; text-decoration: none; justify-content: center; align-items: center; ${showDown ? '' : 'visibility: hidden;'}" onclick="servers:down">
          ${downImg}
        </a>
      </div>
    `;
  })();

  return `\
    <div style="display: flex; height: ${HEIGHT}px;">
      ${leftSrc}
      ${rightSrc}
    </div>
  `;
};

const getCreateServerSrc = (inputText, inputIndex, inputValue, focusType) => {
  return `\
    <div>
      <div style="display: flex; height: 100px; justify-content: center; align-items: center;">
        <a style="display: block; width: 100px;" onclick="home:menu">
          <img src="${chevronLeftIconSrc}" width="80" height="80" />
        </a>
        <div style="margin-right: auto; font-size: 40px;">Create server</div>
      </div>
      <div style="display: flex; width: ${WIDTH}px; height: ${HEIGHT - 100}px; flex-direction: column; justify-content: center; align-items: center;">
        <a style="position: relative; display: block; width: 600px; margin-bottom: 20px; border-bottom: 3px solid #000; font-size: 40px; line-height: 1.4; text-decoration: none; overflow: hidden;" onclick="createServer:focus">
          ${focusType === 'createServer' ? `<div style="position: absolute; width: 2px; top: 2px; bottom: 2px; left: ${inputValue}px; background-color: #333;"></div>` : ''}
          <div>${inputText}</div>
          ${!inputText ? `<div style="color: #AAA;">Choose a name</div>` : ''}
        </a>
        <div style="display: flex; justify-content: center; align-items: center;">
          <a style="display: flex; margin: 30px; padding: 20px; border: 1px solid; border-radius: 5px; font-weight: 400; text-decoration: none; flex-direction: column; justify-content: center; align-items: center;" onclick="createServer:submit">
            <div style="font-size: 24px;">Create server</div>
            <img src="${serverPlusImgSrc}" width="80" height="80" />
          </a>
        </div>
      </div>
    </div>
  `;
};

const getServerTagSrc = ({worldname, url, running, local}) => {
  return `\
    <div style="display: flex; width: ${SERVER_WIDTH}px; height: ${SERVER_HEIGHT}px; padding: 50px; background-color: #EEE; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
      <div style="display: flex; width: 100%;">
        <a style="display: flex; position: absolute; top: 0; right: 0; width: 100px; height: 100px; justify-content: center; align-items: center;" onclick="server:close:${worldname}">
          <img src="${closeBoxImgSrc}" width="80" height="80" />
        </a>
        <img src="${creatureUtils.makeStaticCreature('server:' + worldname)}" width="${SERVER_HEIGHT}" height="${SERVER_HEIGHT}" style="width: ${SERVER_HEIGHT}px; height: ${SERVER_HEIGHT}px; margin: -50px; margin-right: 50px; image-rendering: -moz-crisp-edges; image-rendering: pixelated;" />
        <div style="display: flex; flex-grow: 1; flex-direction: column;">
          <div style="flex-grow: 1;">
            <div style="font-size: 60px; font-weight: 400;">${worldname}</div>
            ${url ?
              `<div style="font-size: 30px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${url}</div>`
            :
              ''
            }
          </div>
          ${local ? `\
            ${running ?
              `<a style="display: flex; margin-bottom: 20px; padding: 10px; background-color: #4CAF50; color: #FFF; font-size: 40px; text-decoration: none; justify-content: center; align-items: center;" onclick="server:copyUrl:${worldname}">Copy URL</a>`
            :
              ''
            }
            <a style="display: flex; align-items: center; text-decoration: none;" onclick="server:toggleRunning:${worldname}">
              <div style="display: flex; margin-right: 30px; align-items: center;">
                ${running ?
                  `<div style="display: flex; justify-content: center; align-items: center;">
                    <div style="display: flex; width: ${(60 * 2) - (5 * 2)}px; height: 60px; padding: 5px; border: 5px solid #333; justify-content: flex-end; align-items: center; box-sizing: border-box;">
                      <div style="width: ${60 - ((5 * 2) + (5 * 2))}px; height: ${60 - ((5 * 2) + (5 * 2))}px; background-color: #333;"></div>
                    </div>
                  </div>`
                :
                  `<div style="display: flex; justify-content: center; align-items: center;">
                    <div style="display: flex; width: ${(60 * 2) - (5 * 2)}px; height: 60px; padding: 5px; border: 5px solid #CCC; justify-content: flex-start; align-items: center; box-sizing: border-box;">
                      <div style="width: ${60 - ((5 * 2) + (5 * 2))}px; height: ${60 - ((5 * 2) + (5 * 2))}px; background-color: #CCC;"></div>
                    </div>
                  </div>`
                }
              </div>
              <div style="font-size: 60px; font-weight: 400; ${running ? 'color: #000;' : 'color: #CCC;'}">${running ? 'Running' : 'Not running'}</div>
            </a>
          `
          :
            ''
          }
        </div>
      </div>
    </div>
  `;
};

const getWalkthroughSrc = ({label}) => {
  label = label.replace(/\$MOUSE/g, `<img src="${mouseImgSrc}" width="24" height="24">`);
console.log('got label', {label});

  return `<div style="display: flex; width: ${WALKTHROUGH_WIDTH}px; height: ${WALKTHROUGH_HEIGHT}px; color: #FFF; flex-direction: column;">
    <div style="display: flex; margin: 10px; height: 150px; background-color: #000; font-size: 24px; font-weight: 400; justify-content: center; align-items: center;">${label}</div>
    <div style="position: relative; width: 100%; height: 50px;">
      <div style="position: absolute; bottom: 5px; left: ${(WALKTHROUGH_WIDTH / 2) - (50 / 2)}px; border-style: solid; border-width: 50px 25px 0 25px; border-color: #000 transparent transparent transparent;"></div>
    </div>
  </div>`;
};

return {
  getHomeMenuSrc,
  getServerTagSrc,
  getWalkthroughSrc,
};

};

module.exports = {
  makeRenderer,
};
