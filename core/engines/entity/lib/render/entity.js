const {
  WIDTH,
  HEIGHT,
} = require('../constants/entity');

const AXES = ['x', 'y', 'z'];

const closeBoxOutline = require('../img/close-box-outline');
const closeOutline = require('../img/close-outline');
const packageVariant = require('../img/package-variant');
const autorenewImg = require('../img/autorenew');
const linkImg = require('../img/link');
const mapMarkerCircle = require('../img/map-marker-circle');
const mapMarkerCircleWhite = require('../img/map-marker-circle-white');
const upImg = require('../img/up');
const downImg = require('../img/down');
const chevronLeftImg = require('../img/chevron-left');
const colorImg = require('../img/color');

const numTagsPerPage = 6;

const makeRenderer = ({typeUtils, creatureUtils}) => {
  const getEntityPageSrc = ({loading, npmInputText, npmInputValue, attributeInputText, attributeInputValue, entity, tagSpecs, numTags, page, focusSpec}) => {
    return `\
      ${entity === null ?
          getEntitiesSrc({loading, npmInputText, npmInputValue, attributeInputText, attributeInputValue, tagSpecs, numTags, page, focusSpec})
        :
          getEntityDetailsSrc({entity, inputText: attributeInputText, inputValue: attributeInputValue, page, focusSpec})
      }
    `;
  };
  const getEntitiesSrc = ({loading, npmInputText, npmInputValue, attributeInputText, attributeInputValue, tagSpecs, numTags, page, focusSpec}) => {
    const numSelected = (() => {
      let result = 0;
      for (let i = 0; i < tagSpecs.length; i++) {
        const entitySpec = tagSpecs[i];
        if (entitySpec.selected) {
          result++;
        }
      }
      return result;
    })();

    const headerSrc = `<div style="display: flex; height: 80px; font-size: 36px; line-height: 1.4; align-items: flex-start;">
      <a style="position: relative; display: block; margin-right: 30px; margin-bottom: 30px; border-bottom: 2px solid; flex-grow: 1; text-decoration: none;" onclick="entity:focus">
        ${(focusSpec && focusSpec.type === 'entity') ?
          `<div style="position: absolute; width: 2px; top: 2px; bottom: 2px; left: ${npmInputValue}px; background-color: #000;"></div>`
        : ''}
        <div style="font-family: 'Lucida Console', Monaco, monospace; font-size: 30px; line-height: ${36 * 1.4}px;" measure="entity:search">${npmInputText.replace(/ /g, '&nbsp;')}</div>
        ${!npmInputText ? `<div>Search entities</div>` : ''}
      </a>
      <div style="display: flex; height: 44px; margin: 0 20px; font-size: 24px; font-weight: 400; align-items: center;">(${numSelected})</div>
      ${numSelected === 0 ?
        `<a style="padding: 10px 15px; border: 2px solid; font-size: 20px; font-weight: 400; text-decoration: none;" onclick="entity:selectAll">Select all</a>`
      :
        `<div style="display: flex;">
          <a style="margin-right: 20px; padding: 10px 15px; border: 2px solid; font-size: 20px; font-weight: 400; text-decoration: none;" onclick="entity:saveEntities">Save entities</a>
          <a style="padding: 10px 15px; border: 2px solid; font-size: 20px; font-weight: 400; text-decoration: none;" onclick="entity:clearAll">Clear all</a>
        </div>`
      }
    </div>`;
    const leftSrc = `<div style="display: flex; flex-grow: 1; flex-direction: column;">
      ${tagSpecs
        .slice(page * numTagsPerPage, (page + 1) * numTagsPerPage)
        .map(tagSpec => getEntitySrc(tagSpec, attributeInputText, attributeInputValue, focusSpec))
        .join('\n')}
    </div>`;
    const rightSrc = (() => {
      const showUp = page !== 0;
      const showDown = (() => {
        const numPages = Math.ceil(numTags / numTagsPerPage);
        return page < (numPages - 1);
      })();

      return `\
        <div style="display: flex; width: 250px; flex-direction: column; box-sizing: border-box;">
          <a style="position: relative; display: flex; margin-left: 30px; margin-bottom: auto; border: 2px solid; border-radius: 5px; text-decoration: none; justify-content: center; align-items: center; ${showUp ? '' : 'visibility: hidden;'}" onclick="entity:up">
            ${upImg}
          </a>
          <a style="position: relative; display: flex; margin-left: 30px; border: 2px solid; border-radius: 5px; text-decoration: none; justify-content: center; align-items: center; ${showDown ? '' : 'visibility: hidden;'}" onclick="entity:down">
            ${downImg}
          </a>
          <div style="width: 1px; height: 50px;"></div>
        </div>
      `;
    })();

    return `\
      <div style="display: flex; width: ${WIDTH}px; min-height: ${HEIGHT}px; padding: 30px; box-sizing: border-box;">
        ${loading ?
          `<div style="display: flex; flex-grow: 1; flex-direction: column;">
            <div style="display: flex; margin-bottom: 100px; font-size: 30px; font-weight: 400; flex-grow: 1; align-items: center; justify-content: center;">Loading...</div>
          </div>`
        :
          `<div style="display: flex; flex-grow: 1; flex-direction: column;">
            ${headerSrc}
            <div style="display: flex; flex-grow: 1;">
              ${leftSrc}
              ${rightSrc}
            </div>
          </div>`
        }
      </div>
    `;
  };
  const getEntitySrc = item => {
    const {id, name, version, attributes, instancing, selected} = item;
    const plugin = _getPlugin(name, version);

    return `\
      <div style="display: flex; height: 80px;">
        <a style="display: flex; justify-content: center; align-items: center;" onclick="entity:select:${id}">
          <div style="display: flex; border: 2px solid; width: 25px; height: 25px; margin: 20px; padding: 3px; box-sizing: border-box; text-decoration: none;">
            ${selected ? `<div style="background-color: #000; flex-grow: 1;"></div>` : ''}
          </div>
        </a>
        <a style="display: block; border-bottom: 1px solid #EEE; flex-grow: 1; text-decoration: none;" onclick="entity:entity:${id}">
          <div style="position: relative; display: flex; padding: 10px 0; flex-direction: column; text-decoration: none; overflow: hidden; box-sizing: border-box;">
            <div style="display: flex; height: 60px; align-items: center;">
              <div style="display: flex; flex-grow: 1;">
                ${creatureUtils.makeSvgCreature('entity:' + name, {
                  width: 12,
                  height: 12,
                  viewBox: '0 0 12 12',
                  style: 'width: 50px; height: 50px; margin: 10px; image-rendering: -moz-crisp-edges; image-rendering: pixelated;',
                })}
                <h1 style="display: flex; flex-grow: 1; font-size: 24px; font-weight: 400; line-height: 1.4; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${plugin}</h1>
              </div>
            </div>
          </div>
        </a>
      </div>
    `;
  };
  const getEntityDetailsSrc = ({entity, inputText, inputValue, page, focusSpec}) => {
    const {id, name, version, attributes, instancing} = entity;
    const plugin = _getPlugin(name, version);

    const leftSrc = `\
      <div style="position: relative; width: 600px; top: ${-page * (HEIGHT - 100)}px; margin-right: auto; padding: 30px; box-sizing: border-box;">
        <div style="display: flex; margin-right: 20px; align-items: center;">
          <a style="display: flex; width: 80px; height: 80px; justify-content: center; align-items: center;" onclick="entity:back">${chevronLeftImg}</a>
          ${creatureUtils.makeSvgCreature('entity:' + name, {
            width: 12,
            height: 12,
            viewBox: '0 0 12 12',
            style: 'width: 80px; height: 80px; margin-right: 20px; image-rendering: -moz-crisp-edges; image-rendering: pixelated;',
          })}
          <div style="margin-right: auto; font-size: 36px; line-height: 1.4; font-weight: 400;">${plugin}</div>
          <a style="display: flex; padding: 15px; text-decoration: none; justify-content: center; align-items: center;" onclick="entity:remove:${id}">
            ${closeOutline}
          </a>
        </div>
        <div style="position: relative; display: flex; padding: 10px 0; flex-direction: column; text-decoration: none; box-sizing: border-box;">
          ${attributes
            .map(attribute => getAttributeSrc(entity, attribute, inputText, inputValue, focusSpec))
            .join('\n')}
        </div>
      </div>
    `;

    const rightSrc = (() => {
      const showUp = page !== 0;
      const showDown = true;

      return `\
        <div style="display: flex; width: 250px; padding-top: 20px; flex-direction: column; box-sizing: border-box;">
          <a style="position: relative; display: flex; margin: 0 30px; margin-bottom: auto; border: 1px solid; border-radius: 5px; text-decoration: none; justify-content: center; align-items: center; ${showUp ? '' : 'visibility: hidden;'}" onclick="entity:up">
            ${upImg}
          </a>
          <a style="position: relative; display: flex; margin: 0 30px; margin-bottom: 20px; border: 1px solid; border-radius: 5px; text-decoration: none; justify-content: center; align-items: center; ${showDown ? '' : 'visibility: hidden;'}" onclick="entity:down">
            ${downImg}
          </a>
        </div>
      `;
    })();

    return `\
      <div style="display: flex; height: ${HEIGHT - 100}px; overflow: hidden;">
        ${leftSrc}
        ${rightSrc}
      </div>
    `;
  };
  const getAttributeSrc = (entity, attribute, inputText, inputValue, focusSpec) => {
    const {id} = entity;
    const {name, type, value, min, max, step, options} = attribute;

    const headerSrc = `\
      <div style="display: flex; height: 50px; margin: 0 20px; font-size: 24px; align-items: center;">
        <div style="margin-right: auto; font-weight: 400;">${name}</div>
        <a style="display: flex; padding: 0 15px; text-decoration: none; justify-content: center; align-items: center;" onclick="entityAttribute:remove:${id}:${name}">
          ${closeOutline}
        </a>
      </div>
    `;
    const bodySrc = `\
      ${getAttributeInputSrc(id, name, type, value, min, max, step, options, inputText, inputValue, focusSpec)}
    `;

    return `\
      <div style="position: relative; display: flex; text-decoration: none; flex-direction: column; box-sizing: border-box;">
        ${headerSrc}
        ${bodySrc}
      </div>
    `;
  };
  const getAttributeInputSrc = (id, name, type, value, min, max, step, options, inputText, inputValue, focusSpec) => {
    const focusType = (() => {
      if (focusSpec && focusSpec.attributeName === name) {
        if (focusSpec.type === 'entityAttribute') {
          return 'input';
        } else if (focusSpec.type === 'entityAttributeMatrix') {
          return 'matrix';
        } else if (focusSpec.type === 'entityAttributeColor') {
          return 'color';
        } else {
          return null;
        }
      } else {
        return null;
      }
    })();
    const focusValue = focusType === null ? value : typeUtils.castValueStringToValue(inputText, type, min, max, step, options);

    switch (type) {
      case 'matrix': {
        return `\
          <div style="display: flex; height: 50px; margin: 0 20px; align-items: center;">
            <a style="display: flex; padding: 15px; ${focusType === 'matrix' ? 'background-color: #000;' : ''} justify-content: center; align-items: center;" onclick="entityAttribute:${id}:${name}:matrix">
              ${focusType === 'matrix' ? mapMarkerCircleWhite : mapMarkerCircle}
            </a>
          </div>
        `;
      }
      case 'vector': {
        if (min === undefined) {
          min = 0;
        }
        if (max === undefined) {
          max = 10;
        }

        let result = '';

        AXES.forEach((axis, index) => {
          const axisValue = value[index];
          const factor = (axisValue - min) / (max - min);

          result += `\
            <div style="display: flex; height: 30px; margin: 5px 20px;">
              <a style="display: flex; position: relative; height: inherit; width: 300px;" onclick="entityAttribute:${id}:${name}:${axis}:tweak">
                <div style="position: absolute; top: 14px; left: 0; right: 0; height: 2px; background-color: #CCC;">
                  <div style="position: absolute; top: -9px; bottom: -9px; left: ${factor * 100}%; margin-left: -1px; width: 2px; background-color: #F00;"></div>
                </div>
              </a>
              <div style="display: flex; width: 50px; height: inherit; color: #000; font-size: 20px; justify-content: center; align-items: center;">${axisValue}</div>
            </div>
          `;
        });

        return result;
      }
      case 'text': {
        return `\
          <a style="display: flex; position: relative; width: 400px; margin: 20px; border: 2px solid #333; font-family: 'Lucida Console', Monaco, monospace; font-size: 20px; line-height: ${24 * 1.4}px; text-decoration: none; align-items: center; overflow: hidden; box-sizing: border-box;" onclick="entityAttribute:${id}:${name}:focus">
            ${focusType === 'input' ? `<div style="position: absolute; width: 2px; top: 0; bottom: 0; left: ${inputValue}px; background-color: #333;"></div>` : ''}
            <div measure="entityAttribute:${id}:${name}">${focusValue}</div>
          </a>
        `;
      }
      case 'number': {
        if (min === undefined) {
          min = 0;
        }
        if (max === undefined) {
          max = 10;
        }

        const factor = focusValue !== null ? ((focusValue - min) / (max - min)) : min;
        const string = focusValue !== null ? String(focusValue) : inputText;

        return `\
          <div style="display: flex;">
            <a style="display: flex; position: relative; width: ${400 - (20 * 2) - 100 - (20 * 2)}px; height: 40px; margin: 5px 20px; margin-right: auto;" onclick="entityAttribute:${id}:${name}:tweak">
              <div style="position: absolute; top: 19px; left: 0; right: 0; height: 2px; background-color: #CCC;">
                <div style="position: absolute; top: -14px; bottom: -14px; left: ${factor * 100}%; margin-left: -1px; width: 2px; background-color: #F00;"></div>
              </div>
            </a>
            <a style="display: flex; position: relative; width: 100px; height: 40px; margin: 5px 20px; border: 2px solid; font-family: 'Lucida Console', Monaco, monospace; font-size: 20px; line-height: ${24 * 1.4}px; font-weight: 400; text-decoration: none; overflow: hidden; box-sizing: border-box;" onclick="entityAttribute:${id}:${name}:focus">
              ${focusType === 'input' ? `<div style="position: absolute; width: 2px; top: 0; bottom: 0; left: ${inputValue}px; background-color: #333;"></div>` : ''}
              <div measure="entityAttribute:${id}:${name}">${string}</div>
            </a>
          </div>
        `;
      }
      case 'select': {
        if (options === undefined) {
          options = [''];
        }

        if (focusType !== 'input') {
          return `\
            <div style="position: relative; height: 40px; margin: 5px 20px; z-index: 1;">
              <div style="display: flex; flex-direction: column; background-color: #FFF;">
                <a style="display: flex; height: 40px; padding: 0 5px; border: 2px solid #333; font-size: 20px; font-weight: 400; text-decoration: none; align-items: center; text-overflow: ellipsis; overflow: hidden; box-sizing: border-box;" onclick="entityAttribute:${id}:${name}:focus">
                  <div style="text-overflow: ellipsis; flex-grow: 1; overflow: hidden;">${focusValue}</div>
                  <div style="display: flex; padding: 0 10px; font-size: 16px; justify-content: center;">▼</div>
                </a>
              </div>
            </div>
          `;
        } else {
          return `\
            <div style="position: relative; height: 40px; margin: 5px 20px; z-index: 1;">
              <div style="display: flex; flex-direction: column; background-color: #FFF;">
                ${options.map((option, i, a) => {
                  const style = (() => {
                    let result = '';
                    if (i !== 0) {
                      result += 'padding-top: 2px; border-top: 0;';
                    }
                    if (i !== (a.length - 1)) {
                      result += 'padding-bottom: 2px; border-bottom: 0;';
                    }
                    /* if (option === focusValue) {
                      result += 'background-color: #EEE;';
                    } */
                    return result;
                  })();
                  return `<a style="display: flex; height: 40px; padding: 0 5px; border: 2px solid #333; ${style}; font-size: 20px; font-weight: 400; text-decoration: none; align-items: center; text-overflow: ellipsis; overflow: hidden; box-sizing: border-box;" onclick="entityAttribute:${id}:${name}:set:${option}">
                    ${option}
                  </a>`;
                }).join('\n')}
              </div>
            </div>
          `;
        }
      }
      case 'color': {
        const color = focusValue !== null ? focusValue : '#CCC';
        const string = focusValue !== null ? focusValue : inputText;

        return `\
          <div style="display: flex; position: relative; height: 50px; margin: 5px 20px; justify-content: center; align-items: center; box-sizing: border-box;">
            ${focusType === 'color' ? `<a style="display: block; position: absolute; top: 0; left: 0; width: 160px; height: 160px; margin-right: auto; border: 2px solid #000; z-index: 1;" onclick="entityAttribute:${id}:${name}:color">
              ${colorImg}
            </a>` : ''}
            <a style="display: block; width: 40px; height: 40px; margin-right: 10px; background-color: ${color}; border: 2px solid #000; box-sizing: border-box;" onclick="entityAttribute:${id}:${name}:pick"></a>
            <a style="display: flex; position: relative; width: 300px; height: 40px; border: 2px solid #333; font-family: 'Lucida Console', Monaco, monospace; font-size: 20px; line-height: ${24 * 1.4}px; text-decoration: none; align-items: center; overflow: hidden; box-sizing: border-box;" onclick="entityAttribute:${id}:${name}:focus">
              ${focusType === 'input' ? `<div style="position: absolute; width: 2px; top: 2px; bottom: 2px; left: ${inputValue}px; background-color: #333;"></div>` : ''}
              <div measure="entityAttribute:${id}:${name}">${string}</div>
            </a>
          </div>
        `;
      }
      case 'checkbox': {
        return `\
          <div style="display: flex; margin: 0 20px;">
            ${focusValue ?
              `<a style="display: flex; width: 50px; height: 50px; justify-content: center; align-items: center;" onclick="entityAttribute:${id}:${name}:toggle">
                <div style="display: flex; width: ${(25 * 2) - (3 * 2)}px; height: 25px; padding: 2px; border: 4px solid #333; justify-content: flex-end; align-items: center; box-sizing: border-box;">
                  <div style="width: ${25 - ((4 * 2) + (2 * 2))}px; height: ${25 - ((4 * 2) + (2 * 2))}px; background-color: #333;"></div>
                </div>
              </a>`
            :
              `<a style="display: flex; width: 50px; height: 50px; justify-content: center; align-items: center;" onclick="entityAttribute:${id}:${name}:toggle">
                <div style="display: flex; width: ${(25 * 2) - (3 * 2)}px; height: 25px; padding: 2px; border: 4px solid #CCC; justify-content: flex-start; align-items: center; box-sizing: border-box;">
                  <div style="width: ${25 - ((4 * 2) + (2 * 2))}px; height: ${25 - ((4 * 2) + (2 * 2))}px; background-color: #CCC;"></div>
                </div>
              </a>`
            }
          </div>
        `;
      }
      case 'file': {
        return `\
          <div style="display: flex; height: 50px; margin: 0 20px; align-items: center;">
            <div style="display: flex; position: relative; font-size: 24px; font-weight: 400; font-style: italic; align-items: center; flex-grow: 1; white-space: nowrap; text-overflow: ellipsis;">${focusValue}</div>
            <a style="display: flex; padding: 15px; justify-content: center; align-items: center;">
              ${linkImg}
            </a>
          </div>
        `;
      }
      default: {
        return '';
      }
    }
  };
  const _getPlugin = (module, version) => /^\//.test(module) ? module : `${module}@${version}`;

  return {
    getEntityPageSrc,
    getEntitiesSrc,
    getEntitySrc,
    getAttributeSrc,
  };
};

module.exports = {
  makeRenderer,
};
