import MarkdownIt from 'markdown-it';
import mdHighlight from 'markdown-it-highlightjs';
import { io } from 'socket.io-client';
import katex from 'katex';
// import hljs from 'highlight.js';
// import python from 'highlight.js/lib/languages/python.js';
// import javascript from 'highlight.js/lib/languages/javascript.js';
// import html from 'highlight.js/lib/languages/xml.js';

export var sourceCodes = [];
let containerID = 0;
let currentStart = 0;

var currentIndex = 0;

//setup socket.io for Juypter notebook

const socket = io('ws://localhost:8000/ws', { transports: ['websocket'], path: '/ws/socket.io' });
console.log("socket is ", socket);

socket.on('connect', () => {
  console.log("connected");
});

function outputHandler(e) {
  console.log("output received: " + e.data);
  document.getElementById(`runningResult${currentIndex+1}`).innerHTML += `\n ${e.data}`;
}

function errorHandler(e) {
  console.log("error occurred: " + e.data);
  document.getElementById(`runningResult${currentIndex+1}`).innerHTML +=`Error Message:\n ${e.data}`;
}

function imageHandler(e) {
  var data = JSON.parse(e.data)
  console.log("image received: " + data['text/plain']);
  var image_data = data['image/png']
  document.getElementById(`runningResult${currentIndex+1}`).innerHTML += `<img src="data:image/png;base64,${image_data}" alt="Figure"/>`;
}

socket.on('output', (e) => outputHandler(e));
socket.on('error', (e) => errorHandler(e));
socket.on('image', (e) => imageHandler(e));

export function renderMarkdown(content) {

  // hljs.registerLanguage('python', python);
  // hljs.registerLanguage('javascript', javascript);
  // hljs.registerLanguage('js', javascript);
  // hljs.registerLanguage('html', html);

  const markdown = MarkdownIt({ linkify: true, breaks: true }).use(mdHighlight);
  //const markdown = MarkdownIt({ linkify: true, breaks: true });

  const fence = markdown.renderer.rules.fence;
  markdown.renderer.rules.fence = (...args) => {
    const [tokens, idx] = args;
    const token = tokens[idx];
    const language = token.info.trim();

    const rawCode = fence?.(...args);

    // Todo: Add latex support, not working yet
    if (language === 'latex') {

      return katex.renderToString(rawCode, {throwOnError: false});

    }


    if (language !== 'python' && language !== 'javascript' && language !== 'js' && language !== 'html') {
      return rawCode;
    }

    sourceCodes.push({'language':language, 'content': token.content});

    // ToDo: Tried to add highlight.js support in the middle of Markdown fence handling, but it seems not working. Still use mdHighlight plugin
    // Need to study how to add specific language support for mdHighlight plugin

    // const highlightedCode = hljs.highlight(rawCode, { language }).value;

    // let regexPattern = /^\`\`\`python\n|^\`\`\`javascript\n|^\`\`\`js\n|^\`\`\`html\n|\n\`\`\`$/gm;
    // let regexPattern = /^<pre><code class="language-python">|^<pre><code class="language-javascript">|^<pre><code class="language-js">|^<pre><code class="language-html">|<\/code><\/pre>$/gm;
    // let strippedCode = highlightedCode.replace(regexPattern, '');

    // console.log("highlightedCode: " + highlightedCode);

    containerID += 1;

    return `<div style="position: relative";>
              <div style="display: flex; flex-direction: column; width: 100%; background: #f0f0f0; border-radius: 8px; padding: 4px 8px; font-size: 18px;">
                <div id="formatedCode${containerID}" style="overflow: auto; color: black; min-height: 100px;">${rawCode}</div>
                <div style="display: none;">
                  <textarea id="rawCode${containerID}" style="overflow: auto; width: 100%; height: 100%; border: none; background: transparent; resize: none; outline: none; padding: 4px 8px; font-size: 18px; color: black;"></textarea>
                </div>
              </div>
              <div id="buttonContainer${containerID}" style="position: relative; top: 0; left: 0; right: 0; bottom: 0; cursor: pointer; border-radius: 8px; display: flex; justify-content: right; align-items: center;">
              </div>
              <div id="runningResult${containerID}" style="position: relative; top: 0; left: 0; right: 0; bottom: 0; background: #f0f0f0; border-radius: 8px; font-size: 18px; display: flex; color: black">
              </div>
            </div>
            `;
  };

  return markdown.render(content);
}

export async function runCode(index) {

  //update current index
  currentIndex = index;

  try {
    if(sourceCodes[index].language === 'html') {
      let dynamichtml = document.getElementById(`runningResult${index+1}`);

      const separatedContent = separateHTMLAndScript(sourceCodes[index].content);
      console.log(separatedContent.html); // HTML without scripts
      console.log(separatedContent.scripts); // Array of script strings

      dynamichtml.innerHTML = separatedContent.html;

      // Todos: remove the style for body element, or it will affect the whole page
      // Done Dec 28 2023
      
      dynamichtml.innerHTML += `<style>${separatedContent.style}</style>`;

      // Function to get a snapshot of the current global symbols
      function getGlobalSymbols() {
        return Object.getOwnPropertyNames(window);
      }

      // Get the initial list of global symbols
      const initialSymbols = getGlobalSymbols();

      loadScriptsInOrder(dynamichtml, separatedContent.scripts, function() {
        console.log('All scripts loaded in order!');
        // Your code to run after all scripts have been loaded

        // Get the updated list of global symbols
        const newSymbols = getGlobalSymbols();

        // Find out which symbols are new by comparing the before and after lists
        const addedSymbols = newSymbols.filter(symbol => !initialSymbols.includes(symbol));

        // Do something with the list of added symbols
        console.log('Newly added symbols:', addedSymbols);

      });

      return;
    }
    
    // Support Jupyter notebook
    const response = await fetch("http://127.0.0.1:8000/execute", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: sourceCodes[index].content,
        language: sourceCodes[index].language
      })
    });

    if (!response.ok) {
      throw new Error('Network response not ok');
    }

    document.getElementById(`runningResult${index+1}`).innerHTML = "Running...";

    // const data = await response.text(); // parse the JSON from the response

    // console.log("Code Running Result: " + data);
    // if(JSON.parse(data)['output'] !== undefined){
    //   document.getElementById(`runningResult${index+1}`).innerHTML = JSON.parse(data)['output'];
    // } else {
    //   document.getElementById(`runningResult${index+1}`).innerHTML = JSON.parse(data)['error'];
    // }

  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error);
  }
}

export function registerButton(){

  // Attach the event listener only once to the parent container

  for(let i=currentStart + 1; i<=containerID; i++) {
    console.log("buttonContainer" + i);
    // Create a new button element
    let button = document.createElement('button');
            
    // Set button text or any attributes if needed
    button.textContent = 'Run Code';
    button.style.fontSize = '16px';
    button.style.padding = '8px 16px';
    button.style.borderRadius = '4px';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.background = '#4CAF50';
    button.style.color = 'white';
    button.style.marginRight = '2px';
    button.style.marginLeft = '2px';
    

    document.getElementById(`buttonContainer${i}`).appendChild(button);

    // Create a new button element
    button = document.createElement('button');
            
    // Set button text or any attributes if needed
    button.textContent = 'Save Code';
    button.id = `saveCode${i}`;
    button.style.fontSize = '16px';
    button.style.padding = '8px 16px';
    button.style.borderRadius = '4px';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.background = '#4CAF50';
    button.style.color = 'white';
    button.style.display = 'none';
    button.style.marginRight = '2px';
    button.style.marginLeft = '2px';

    document.getElementById(`buttonContainer${i}`).appendChild(button);
  };

  currentStart = containerID;
}

function separateHTMLAndScript(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Object to hold script contents and HTML content
  const result = {
      scripts: [],
      html: "",
      style: ""
  };

  // Function to recursively extract scripts and return clean HTML
  const extractScripts = (node) => {
      for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];

          // If child is a script element, store its content and remove it
          if (child.tagName === 'SCRIPT') {
              if(child.src) {
                let script = document.createElement('script');
                script.src = child.src;
                script.type = 'text/javascript';
                result.scripts.push(script);
              }
              else {
                let script = document.createElement('script');
                script.text = child.textContent || child.innerText;
                script.type = 'text/javascript';
                result.scripts.push(script);
              }
              node.removeChild(child);
              i--; // Adjust iterator after removing child
          } else if (child.childNodes.length > 0) {
              // If the child has its own children, recurse into those
              extractScripts(child);
          }
      }
  };

  // Execute extraction function starting from the body element

  extractScripts(doc);

  let headStyleElements = doc.getElementsByTagName('style');
  
  let style = headStyleElements.length > 0 ? headStyleElements[0] : null;

  // remove body style rules from the style element

  if (style) {
    var styles = style.innerHTML;

    // Use regex to remove any <body> tag selector and its immediate curly braces block
    // This regex looks for 'body' followed by any number of whitespace and/or other characters (non-greedy), 
    // then an opening brace, then any number of characters (including new lines and spaces) until the next closing brace.  
    var bodyStyleRegex = /body\s*{[^}]*}/gmi;

    // Replace body style rules with an empty string
    var cleanedStyles = styles.replace(bodyStyleRegex, '');

    // Set the style element's content to the new CSS without the body rules
    style.innerHTML = cleanedStyles;
  }


  console.log("style: " + (style ? style.innerHTML : "No style"));

  result.html = doc.body.innerHTML;
  result.style = style ? style.innerHTML : "";

  return result;
}

function loadScriptsInOrder(node, scripts, callback) {
  function loadScript(script) {
      return new Promise((resolve, reject) => {
          console.log("script appended: " + script);
          script.onload = ()=>{
              console.log("script loaded: " + script);
              resolve();
          }
          script.onerror = ()=>reject();
          node.appendChild(script);
          if (script.src ==='') {
            resolve();
          }
          // Resolve the promise immediately, this could be problematic, but onload event seems not fired. This is a workaround
      });
  }

  const promiseChain = scripts.reduce((chain, script) => {
      return chain.then(() => loadScript(script));
  }, Promise.resolve());

  // Once all scripts are loaded, you can run a callback function
  promiseChain.then(() => {
      if (typeof callback === 'function') {
          callback();
      }
  }).catch(error => {
      console.log('A script failed to load:', error);
  });
}
