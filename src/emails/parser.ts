// import * as templates from './templates.json';
// import * as _pages from './pages.json';
// import * as _sections from './sections.json';

const templates = require('./template.json');
const projectData: any = {};
let changes: any = {};
export class CampaignParser
{
  public static getStructure(project)
  {
    changes = project.changes;
    let html = `<html><head><title>TUDOR</title>`;
    html += `</head><body>`;
    const id = project.templateID;
    let template = templates[id];
    if (!template) { template = templates[3]; }
    html += CampaignParser.addElements(html, template);

    html += `</body></html>`;
    return html;
  }

  public static structureToHTML(project: any, pageName: string, editable = false): string
  {
    // projectData = data;
    // const templateID = structure.id;
    let html = `<html><head><title>TUDOR</title>`;
    html += `</head><body>`;
    const page = CampaignParser.addElements(project, pageName);

    html += `</body></html>`;
    console.log(html);
    return html;

  }

  public static addElements(html: string, section: any): string
  {
    const elements = section.elements;
    if (!elements) { return html; }

    for (let j = 0; j < elements.length; j++)
    {
      const element = elements[j];

      const type = element.type.toLowerCase();
      html += `<${type}`;
      // check for attributes
      if (element.id) { html += ` id="${element.id}"`; }
      if (element.attributes)
      {
        let shouldReplace = true;
        for (const key in element.attributes)
        {
          if (element.attributes.hasOwnProperty(key))
          {
            if (key === 'onclick') { shouldReplace = false; }
          }
        }

        for (let key in element.attributes)
        {
          if (element.attributes.hasOwnProperty(key))
          {
            if (typeof element.attributes[key] !== 'string' || !shouldReplace)
            {
              html += ` ${key}="${element.attributes[key]}"`;
              continue;
            }
            let attribute = element.attributes[key];
            if (key === 'src' && element.id && changes.imageSources && changes.imageSources[element.id])
            {
              attribute = changes.imageSources[element.id];
            }
            if (!(type === 'a' && key === 'href')) { html += ` ${key}="${attribute}"`; }
            // else { targetAttribute = attribute; }

          }
        }
      }

      // if (targetAttribute || element.editable)
      // {
      //   targetAttribute = (targetAttribute) ? (`'${targetAttribute}'`) : (null);
      //   const editable = (element.editable) ? (`'${element.editable}'`) : (null);
      //   const editType = (element['edit-type']) ? (`'${element['edit-type']}'`) : (null);
      //   const add = ' onclick = elementClicked(event,' + targetAttribute + ',' + editable + ',' + editType + ')';
      //   html += add;
      // }

      html += `>`;

      // check for text
      let text = element.text;
      if (element.id && changes.text && changes.text[element.id]) { text = changes.text[element.id]; }
      if (text) { html += text; }

      if (element.elements) { html = CampaignParser.addElements(html, element); }

      // closing tag
      html += `</${element.type.toLowerCase()}>`;
    }

    return html;
  }
}
