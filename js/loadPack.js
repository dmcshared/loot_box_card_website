export async function loadCards(url) {
  let data = await fetch(url).then((x) => x.text());

  let domParser = new DOMParser();
  let parsed = domParser.parseFromString(data, "image/svg+xml");

  console.log(parsed);
  window.parsed = parsed;

  const types = [...parsed.querySelectorAll("#layer1 > g")];
  for (let i of types) {
    i.removeAttribute("transform");
    i.objData = JSON.parse(i.querySelector(":scope > desc").textContent);
    populateTags(i.objData);
  }

  const definedTypes = types.filter((x) => !("template" in x.objData));
  const templatedTypes = types.filter((x) => "template" in x.objData);

  return {
    definedTypes,
    templatedTypes,
  };
}

function populateTags(obj) {
  // populate tag obj.tag into obj.tags tree
  let tags = obj.tag.split("+");
  for (let i of tags) {
    let tag = i.split(".");
    let current = obj.tags;
    for (let j of tag) {
      if (!(j in current)) {
        current[j] = {};
      }
      current = current[j];
    }
  }
}

function checkTag(tagsTree, tag) {
  let tags = tag.split("+");
  for (let i of tags) {
    let tag = i.split(".");
    let current = tagsTree;
    for (let j of tag) {
      if (!(j in current)) {
        return false;
      }
      current = current[j];
    }
  }

  return true;
}

function getTag(tagsTree, tagp) {
  let [data_tag, ...tags] = tagp.split("+");
  for (let i of tags) {
    let tag = i.split(".");
    let current = tagsTree;
    for (let j of tag) {
      if (!(j in current)) {
        return;
      }
      current = current[j];
    }
  }

  let tag = data_tag.split(".");
  let current = tagsTree;
  for (let j of tag) {
    if (!(j in current)) {
      return;
    }
    current = current[j];
  }

  return current;
}

/**
 * @template T
 * @param {T[][]} choices
 * @returns {T[][]}
 */
function choices(choicematrix) {
  let [current_layer, ...rest] = choicematrix;

  if (rest.length == 0) return current_layer.map((x) => [x]);

  const restChoices = choices(rest);

  return current_layer.flatMap((x) => restChoices.map((y) => [x, ...y]));
}

/**
 * @template T
 * @param {{[ident:string]: T[]}} choiceList
 * @returns {{[key:string]: T}[]}
 */
function choose(choiceList) {
  const keyMap = Object.keys(choiceList);
  const choiceItems = Object.values(choiceList);

  const choiceMatrix = choices(choiceItems);

  return choiceMatrix.map((x) => {
    let result = {};
    for (let i = 0; i < keyMap.length; i++) {
      result[keyMap[i]] = x[i];
    }
    return result;
  });
}

/**
 *
 * @param {(Element & {objData: FullCard})[]} templates
 * @param {(Element & {objData: FullCard})[]} defs
 * @returns
 */
function generateTemplateInstances(templates, defs) {
  let instances = [];
  for (let template of templates) {
    const parameters = template.objData.template.params;
    for (let param in parameters) {
      parameters[param] = defs.filter((x) =>
        checkTag(x.objData.tags, parameters[param])
      );
    }
    /** @type {{[name: string]: (Element & {objData: FullCard})}[]} */
    const totalInstances = choose(parameters);
    console.log(totalInstances);
    for (let instance of totalInstances) {
      // get data values
      const defs = {};
      Object.entries(template.objData.template.defs).map(([k, v]) => {
        if (v.type == "tag_value") {
          defs[k] = getTag(instance[v.from].objData.tags, v.tag);
        }
      });

      console.log(defs);

      let newInstance = template.cloneNode(true);
      newInstance.objData = template.objData;
      for (let i in defs) {
        newInstance.id = newInstance.id.replaceAll("{" + i + "}", defs[i]);
        newInstance.innerHTML = newInstance.innerHTML.replaceAll(
          "{" + i + "}",
          defs[i]
        );
      }
      instances.push(newInstance);
    }
  }
  return instances;
}

/**
 * @param {(Element & {objData: FullCard})[]} instances
 */
function applyActions(instances) {
  for (let instance of instances) {
    let actionables = [...instance.querySelectorAll("desc")].map(
      (x) => x.parentElement
    );
    actionables.splice(
      actionables.findIndex((x) => x == instance),
      1
    );

    actionables: for (let actionable of actionables) {
      /** @type {Part} */
      const data = JSON.parse(
        actionable.querySelector(":scope > desc").textContent
      );

      for (let datum of data.actions) {
        if (datum.type == "remove") {
          actionable.parentNode.removeChild(actionable);
          continue actionables;
        } else if (datum.type == "set_value") {
          actionable.setAttribute(datum.value, datum.from);
        } else if (datum.type == "set_style") {
          actionable.style[datum.value] = datum.from;
        }
      }
    }
  }
}

(async function () {
  const packs = ["./packs/objects.svg"];

  const packItems = {
    definedTypes: [],
    templatedTypes: [],
  };

  await Promise.all(
    packs.map((i) =>
      loadCards(i).then(({ definedTypes: def, templatedTypes: temp }) => {
        packItems.definedTypes.push(...def);
        packItems.templatedTypes.push(...temp);
      })
    )
  );

  packItems.definedTypes.push(
    ...generateTemplateInstances(
      packItems.templatedTypes,
      packItems.definedTypes
    )
  );

  applyActions(packItems.definedTypes);

  for (let i of packItems.definedTypes) {
    const s = (document.body.innerHTML += `
<svg
   width="512.0px"
   height="512.0px"
   viewBox="0 0 512.0 512.0"
   version="1.1"
   id="SVGRoot"
   sodipodi:docname="cards.svg"
   inkscape:version="1.1.1 (3bf5ae0d25, 2021-09-20)"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg"
   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
   xmlns:cc="http://creativecommons.org/ns#">${i.outerHTML}</svg>`);
  }
})();
