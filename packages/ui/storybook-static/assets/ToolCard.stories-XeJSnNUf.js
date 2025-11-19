import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{G as d}from"./Grid-CwYSw3zt.js";import{B as C}from"./Button-DGjuVaIk.js";import{C as b}from"./Card-DdCIGXUg.js";import"./iframe-Cpc-BwD0.js";import"./preload-helper-D9Z9MdNV.js";const o=({title:p,description:m,icon:g,status:y,onClick:u,actionText:v})=>{const a=y==="coming-soon";return e.jsxs(b,{variant:a?"disabled":"interactive",hoverable:!a,noPadding:!0,className:"ui-toolCard",onClick:a?void 0:u,children:[e.jsx("div",{className:"ui-toolCard-icon",children:g}),e.jsx("h3",{className:"ui-toolCard-title",children:p}),e.jsx("p",{className:"ui-toolCard-description",children:m}),e.jsx("div",{className:"ui-toolCard-button",children:e.jsx(C,{variant:a?"secondary":"primary",disabled:a,fullWidth:!0,onClick:a?void 0:u,children:v||(a?"Coming Soon":"Open Tool")})})]})};try{o.displayName="ToolCard",o.__docgenInfo={description:"ToolCard component for displaying tools in a dashboard",displayName:"ToolCard",props:{title:{defaultValue:null,description:"The title of the tool",name:"title",required:!0,type:{name:"string"}},description:{defaultValue:null,description:"The description of the tool",name:"description",required:!0,type:{name:"string"}},icon:{defaultValue:null,description:"The icon to display (emoji or icon component)",name:"icon",required:!0,type:{name:"ReactNode"}},status:{defaultValue:null,description:"The status of the tool",name:"status",required:!0,type:{name:"enum",value:[{value:'"available"'},{value:'"coming-soon"'}]}},onClick:{defaultValue:null,description:"Click handler for the card",name:"onClick",required:!1,type:{name:"(() => void) | undefined"}},actionText:{defaultValue:null,description:"Custom action button text",name:"actionText",required:!1,type:{name:"string | undefined"}}}}}catch{}const A={title:"Components/ToolCard",component:o,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{status:{control:{type:"select"},options:["available","coming-soon"]},icon:{control:{type:"text"}},onClick:{action:"clicked"}}},t={args:{title:"Analytics Dashboard",description:"View comprehensive analytics and insights for your projects.",icon:"📊",status:"available"}},i={args:{title:"AI Assistant",description:"Get intelligent suggestions and automated code reviews.",icon:"🤖",status:"coming-soon"}},n={args:{title:"Deploy Project",description:"Deploy your application to production with one click.",icon:"🚀",status:"available",actionText:"Deploy Now"}},s={args:{title:"Advanced Configuration",description:"Configure advanced settings, environment variables, build processes, deployment pipelines, and monitoring tools for your application.",icon:"⚙️",status:"available"}},r={render:()=>e.jsxs(d,{columns:3,gap:"medium",children:[e.jsx(o,{title:"Code Editor",description:"Edit and manage your code with syntax highlighting and IntelliSense.",icon:"💻",status:"available",onClick:()=>console.log("Code Editor clicked")}),e.jsx(o,{title:"Database Manager",description:"Manage your databases, run queries, and view data relationships.",icon:"🗄️",status:"available",onClick:()=>console.log("Database Manager clicked")}),e.jsx(o,{title:"API Testing",description:"Test your APIs, manage endpoints, and validate responses.",icon:"🔌",status:"available",onClick:()=>console.log("API Testing clicked")}),e.jsx(o,{title:"Performance Monitor",description:"Monitor application performance, track metrics, and identify bottlenecks.",icon:"📈",status:"coming-soon"}),e.jsx(o,{title:"Security Scanner",description:"Scan your code for security vulnerabilities and compliance issues.",icon:"🔒",status:"coming-soon"}),e.jsx(o,{title:"Team Collaboration",description:"Collaborate with your team, share code, and manage project tasks.",icon:"👥",status:"available",actionText:"Join Team",onClick:()=>console.log("Team Collaboration clicked")})]}),parameters:{layout:"padded"}},l={render:()=>e.jsxs(d,{columns:2,gap:"medium",children:[e.jsx(o,{title:"File Manager",description:"Organize and manage your project files and folders.",icon:"📁",status:"available"}),e.jsx(o,{title:"Terminal",description:"Access command line interface and run shell commands.",icon:"⌨️",status:"available"}),e.jsx(o,{title:"Git Integration",description:"Manage version control, commits, and repository operations.",icon:"🌿",status:"available"}),e.jsx(o,{title:"Package Manager",description:"Install, update, and manage project dependencies.",icon:"📦",status:"available"})]}),parameters:{layout:"padded"}},c={render:()=>e.jsxs(d,{columns:2,gap:"large",children:[e.jsx(o,{title:"Available Tool",description:"This tool is ready to use and fully functional.",icon:"✅",status:"available",onClick:()=>console.log("Available tool clicked")}),e.jsx(o,{title:"Coming Soon Tool",description:"This tool is under development and will be available soon.",icon:"🚧",status:"coming-soon"})]}),parameters:{layout:"padded"}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Analytics Dashboard',
    description: 'View comprehensive analytics and insights for your projects.',
    icon: '📊',
    status: 'available'
  }
}`,...t.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'AI Assistant',
    description: 'Get intelligent suggestions and automated code reviews.',
    icon: '🤖',
    status: 'coming-soon'
  }
}`,...i.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Deploy Project',
    description: 'Deploy your application to production with one click.',
    icon: '🚀',
    status: 'available',
    actionText: 'Deploy Now'
  }
}`,...n.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Advanced Configuration',
    description: 'Configure advanced settings, environment variables, build processes, deployment pipelines, and monitoring tools for your application.',
    icon: '⚙️',
    status: 'available'
  }
}`,...s.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <Grid columns={3} gap="medium">
      <ToolCard title="Code Editor" description="Edit and manage your code with syntax highlighting and IntelliSense." icon="💻" status="available" onClick={() => console.log('Code Editor clicked')} />
      <ToolCard title="Database Manager" description="Manage your databases, run queries, and view data relationships." icon="🗄️" status="available" onClick={() => console.log('Database Manager clicked')} />
      <ToolCard title="API Testing" description="Test your APIs, manage endpoints, and validate responses." icon="🔌" status="available" onClick={() => console.log('API Testing clicked')} />
      <ToolCard title="Performance Monitor" description="Monitor application performance, track metrics, and identify bottlenecks." icon="📈" status="coming-soon" />
      <ToolCard title="Security Scanner" description="Scan your code for security vulnerabilities and compliance issues." icon="🔒" status="coming-soon" />
      <ToolCard title="Team Collaboration" description="Collaborate with your team, share code, and manage project tasks." icon="👥" status="available" actionText="Join Team" onClick={() => console.log('Team Collaboration clicked')} />
    </Grid>,
  parameters: {
    layout: 'padded'
  }
}`,...r.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <Grid columns={2} gap="medium">
      <ToolCard title="File Manager" description="Organize and manage your project files and folders." icon="📁" status="available" />
      <ToolCard title="Terminal" description="Access command line interface and run shell commands." icon="⌨️" status="available" />
      <ToolCard title="Git Integration" description="Manage version control, commits, and repository operations." icon="🌿" status="available" />
      <ToolCard title="Package Manager" description="Install, update, and manage project dependencies." icon="📦" status="available" />
    </Grid>,
  parameters: {
    layout: 'padded'
  }
}`,...l.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <Grid columns={2} gap="large">
      <ToolCard title="Available Tool" description="This tool is ready to use and fully functional." icon="✅" status="available" onClick={() => console.log('Available tool clicked')} />
      <ToolCard title="Coming Soon Tool" description="This tool is under development and will be available soon." icon="🚧" status="coming-soon" />
    </Grid>,
  parameters: {
    layout: 'padded'
  }
}`,...c.parameters?.docs?.source}}};const S=["Default","ComingSoon","CustomAction","LongDescription","ToolGrid","DifferentIcons","StatusComparison"];export{i as ComingSoon,n as CustomAction,t as Default,l as DifferentIcons,s as LongDescription,c as StatusComparison,r as ToolGrid,S as __namedExportsOrder,A as default};
