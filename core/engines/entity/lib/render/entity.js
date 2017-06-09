const {
  WIDTH,
  HEIGHT,
} = require('../constants/entity');

const AXES = ['x', 'y', 'z'];

const vectorPolygonImg = require('../img/vector-polygon');
const vectorPolygonImgSrc = 'data:image/svg+xml;base64,' + btoa(vectorPolygonImg);
const closeBoxOutline = require('../img/close-box-outline');
const closeBoxOutlineSrc = 'data:image/svg+xml;base64,' + btoa(closeBoxOutline);
const closeOutline = require('../img/close-outline');
const closeOutlineSrc = 'data:image/svg+xml;base64,' + btoa(closeOutline);
const packageVariant = require('../img/package-variant');
const packageVariantSrc = 'data:image/svg+xml;base64,' + btoa(packageVariant);
const packageVariantClosed = require('../img/package-variant-closed');
const packageVariantClosedSrc = 'data:image/svg+xml;base64,' + btoa(packageVariantClosed);
const autorenewImg = require('../img/autorenew');
const autorenewImgSrc = 'data:image/svg+xml;base64,' + btoa(autorenewImg);
const closeBoxImg = require('../img/close-box');
const closeBoxImgSrc = 'data:image/svg+xml;base64,' + btoa(closeBoxImg);
const linkImg = require('../img/link');
const linkImgSrc = 'data:image/svg+xml;base64,' + btoa(linkImg);
const upImg = require('../img/up');
const downImg = require('../img/down');

const numTagsPerPage = 1;

const makeRenderer = ({menuUtils, creatureUtils}) => {
  const getEntityPageSrc = ({loading, npmInputText, npmInputValue, attributeInputText, attributeInputValue, tagSpecs, numTags, page, focusSpec}) => {
    const leftSrc = `\
      <div style="display: flex; padding: 30px; font-size: 36px; line-height: 1.4; flex-grow: 1; flex-direction: column;">
        <a style="position: relative; display: block; margin-bottom: 20px; border-bottom: 2px solid; text-decoration: none;" onclick="entity:focus">
          ${(focusSpec && focusSpec.type === 'entity') ?
            `<div style="position: absolute; width: 2px; top: 2px; bottom: 2px; left: ${npmInputValue}px; background-color: #000;"></div>`
          : ''}
          <div>${npmInputText}</div>
          ${!npmInputText ? `<div>Search entities</div>` : ''}
        </a>
        ${tagSpecs
          .slice(page * numTagsPerPage, (page + 1) * numTagsPerPage)
          .map(tagSpec => getEntitySrc(tagSpec, attributeInputText, attributeInputValue, focusSpec))
          .join('\n')}
        ${loading ? `<div style="display: flex; margin-bottom: 100px; font-size: 30px; align-items: center; justify-content: center; flex-grow: 1;">Loading...</div>` : ''}
      </div>
    `;
    const rightSrc = (() => {
      const showUp = page !== 0;
      const showDown = (() => {
        const numPages = Math.ceil(numTags / numTagsPerPage);
        return page < (numPages - 1);
      })();

      return `\
        <div style="display: flex; width: 250px; min-height: ${HEIGHT}px; padding-top: 20px; flex-direction: column; box-sizing: border-box;">
          <div style="width: 1px; height: 100px;"></div>
          <a style="position: relative; display: flex; margin: 0 30px; margin-bottom: auto; border: 2px solid; border-radius: 5px; text-decoration: none; justify-content: center; align-items: center; ${showUp ? '' : 'visibility: hidden;'}" onclick="entity:up">
            ${upImg}
          </a>
          <a style="position: relative; display: flex; margin: 0 30px; border: 2px solid; border-radius: 5px; text-decoration: none; justify-content: center; align-items: center; ${showDown ? '' : 'visibility: hidden;'}" onclick="entity:down">
            ${downImg}
          </a>
          <div style="width: 1px; height: 50px;"></div>
        </div>
      `;
    })();

    return `\
      <div style="display: flex; min-height: ${HEIGHT}px;">
        ${leftSrc}
        ${rightSrc}
      </div>
    `;
  };
  const getEntitySrc = (item, inputText, inputValue, focusSpec) => {
    const {id, name, displayName, attributes, instancing, metadata: {isStatic}} = item;
    const tagName = isStatic ? 'a' : 'div';

    return `\
      <div style="display: block; border-bottom: 1px solid #EEE;">
        <${tagName} style="display: block; width: 400px; text-decoration: none;" onclick="entity:main:${id}">
          <div style="position: relative; display: flex; padding: 10px 0; flex-direction: column; text-decoration: none; overflow: hidden; box-sizing: border-box;">
            <div style="display: flex; height: 50px; align-items: center;">
              <div style="display: flex; flex-grow: 1;">
                <img src="${creatureUtils.makeStaticCreature('entity:' + name)}" width="50" height="50" style="width: 50px; height: 50px; margin: 10px; image-rendering: -moz-crisp-edges; image-rendering: pixelated;" />
                <h1 style="display: flex; flex-grow: 1; font-size: 24px; font-weight: 400; line-height: 1.4; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${displayName}</h1>
              </div>
              ${!isStatic ? `<a style="display: flex; padding: 15px; text-decoration: none; justify-content: center; align-items: center;" onclick="entity:remove:${id}">
                <img src="${closeOutlineSrc}" width="30" height="30" />
              </a>` : ''}
            </div>
            ${attributes
              .map(attribute => getAttributeSrc(item, attribute, inputText, inputValue, focusSpec))
              .join('\n')}
          </div>
        </${tagName}>
      </div>
    `;
  };
  const getAttributeSrc = (item, attribute, inputText, inputValue, focusSpec) => {
    const {id} = item;
    const {name, type, value, min, max, step, options} = attribute;

    const headerSrc = `\
      <div style="display: flex; height: 50px; font-size: 24px; align-items: center;">
        <div style="margin-left: 20px; margin-right: auto; font-weight: 400;">${name}</div>
        <a style="display: flex; padding: 0 15px; text-decoration: none; justify-content: center; align-items: center;" onclick="entityAttribute:remove:${id}:${name}">
          <img src="${closeOutlineSrc}" width="30" height="30" />
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
    const focus = Boolean(focusSpec && focusSpec.type === 'entityAttribute' && focusSpec.attributeName === name);
    const focusValue = !focus ? value : menuUtils.castValueStringToValue(inputText, type, min, max, step, options);

    switch (type) {
      case 'matrix': {
        return '';
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
              <a style="display: flex; position: relative; height: inherit; width: 300px;" onclick="entityAttribute:${id}:${name}:${axis}:tweak" onmousedown="entityAttribute:${id}:${name}:${axis}:tweak">
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
          <a style="display: flex; position: relative; margin: 20px; border: 2px solid #333; font-size: 24px; text-decoration: none; align-items: center; overflow: hidden; box-sizing: border-box;" onclick="entityAttribute:${id}:${name}:focus" onmousedown="entityAttribute:${id}:${name}:focus">
            ${focus ? `<div style="position: absolute; width: 2px; top: 0; bottom: 0; left: ${inputValue}px; background-color: #333;"></div>` : ''}
            <div>${focusValue}</div>
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
            <a style="display: flex; position: relative; width: ${400 - (20 * 2) - 100 - (20 * 2)}px; height: 40px; margin: 5px 20px; margin-right: auto;" onclick="entityAttribute:${id}:${name}:tweak" onmousedown="entityAttribute:${id}:${name}:tweak">
              <div style="position: absolute; top: 19px; left: 0; right: 0; height: 2px; background-color: #CCC;">
                <div style="position: absolute; top: -14px; bottom: -14px; left: ${factor * 100}%; margin-left: -1px; width: 2px; background-color: #F00;"></div>
              </div>
            </a>
            <a style="display: flex; position: relative; width: 100px; height: 40px; margin: 5px 20px; border: 2px solid; font-size: 24px; font-weight: 400; text-decoration: none; overflow: hidden; box-sizing: border-box;" onclick="entityAttribute:${id}:${name}:focus" onmousedown="entityAttribute:${id}:${name}:focus">
              ${focus ? `<div style="position: absolute; width: 2px; top: 0; bottom: 0; left: ${inputValue}px; background-color: #333;"></div>` : ''}
              <div>${string}</div>
            </a>
          </div>
        `;
      }
      case 'select': {
        if (options === undefined) {
          options = [''];
        }

        if (!focus) {
          return `\
            <a style="display: flex; height: 40px; margin: 5px 20px; padding: 5px; border: 2px solid #333; font-size: 20px; text-decoration: none; align-items: center; box-sizing: border-box;" onclick="entityAttribute:${id}:${name}:focus" onmousedown="entityAttribute:${id}:${name}:focus">
              <div style="text-overflow: ellipsis; flex-grow: 1; overflow: hidden;">${focusValue}</div>
              <div style="display: flex; padding: 0 10px; font-size: 16px; justify-content: center;">▼</div>
            </a>
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
                    if (option === focusValue) {
                      result += 'background-color: #EEE;';
                    }
                    return result;
                  })();
                  return `<a style="display: flex; height: 40px; padding: 5px; border: 2px solid #333; ${style}; font-size: 20px; text-decoration: none; align-items: center; text-overflow: ellipsis; overflow: hidden; box-sizing: border-box;" onclick="entityAttribute:${id}:${name}:set:${option}" onmousedown="entityAttribute:${id}:${name}:set:${option}">
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
          <div style="display: flex; height: 50px; margin: 5px 20px; justify-content: center; align-items: center; box-sizing: border-box;">
            <a style="display: block; width: 40px; height: 40px; margin-right: 10px; background-color: ${color};" onclick="entityAttribute:${id}:${name}:pick"></a>
            <a style="display: flex; position: relative; height: 40px; border: 2px solid #333; font-size: 24px; text-decoration: none; flex-grow: 1; align-items: center; overflow: hidden; box-sizing: border-box;" onclick="entityAttribute:${id}:${name}:focus" onmousedown="entityAttribute:${id}:${name}:focus">
              ${focus ? `<div style="position: absolute; width: 2px; top: 2px; bottom: 2px; left: ${inputValue}px; background-color: #333;"></div>` : ''}
              <div>${string}</div>
            </a>
          </div>
        `;
      }
      case 'checkbox': {
        return `\
          <div style="display: flex; margin: 0 20px;">
            ${focusValue ?
              `<a style="display: flex; width: 50px; height: 50px; justify-content: center; align-items: center;" onclick="entityAttribute:${id}:${name}:toggle" onmousedown="entityAttribute:${id}:${name}:toggle">
                <div style="display: flex; width: ${(25 * 2) - (3 * 2)}px; height: 25px; padding: 2px; border: 4px solid #333; justify-content: flex-end; align-items: center; box-sizing: border-box;">
                  <div style="width: ${25 - ((4 * 2) + (2 * 2))}px; height: ${25 - ((4 * 2) + (2 * 2))}px; background-color: #333;"></div>
                </div>
              </a>`
            :
              `<a style="display: flex; width: 50px; height: 50px; justify-content: center; align-items: center;" onclick="entityAttribute:${id}:${name}:toggle" onmousedown="entityAttribute:${id}:${name}:toggle">
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
          <div style="display: flex; width: 300px; height: 50px;">
            <div style="display: flex; position: relative; margin: 20px; font-size: 24px; align-items: center; flex-grow: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${focusValue}</div>
            <a style="display: flex; width: 80px; justify-content: center; align-items: center;" onmousedown="entityAttribute:${id}:${name}:link">
              <img src="${linkImgSrc}" width="50" height="50" style="margin: 10px; image-rendering: pixelated;" />
            </a>
          </div>
        `;
      }
      default: {
        return '';
      }
    }
  };


  return {
    getEntityPageSrc,
    getEntitySrc,
    getAttributeSrc,
  };
};

module.exports = {
  makeRenderer,
};