import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as d}from"./iframe-Cpc-BwD0.js";import{B as s}from"./Button-DGjuVaIk.js";import{I as x}from"./Input-Cy7KB3pj.js";import{r as E}from"./index-Rj2TOCSW.js";import"./preload-helper-D9Z9MdNV.js";var S=E();const L="_overlay_1mht7_2",N="_modal_1mht7_16",T="_small_1mht7_28",F="_medium_1mht7_32",q="_large_1mht7_36",w="_extraLarge_1mht7_40",z="_header_1mht7_45",D="_title_1mht7_53",V="_closeButton_1mht7_60",W="_content_1mht7_76",R="_footer_1mht7_81",A="_fadeIn_1mht7_1",P="_slideIn_1mht7_1",o={overlay:L,modal:N,small:T,medium:F,large:q,extraLarge:w,header:z,title:D,closeButton:V,content:W,footer:R,fadeIn:A,slideIn:P},l=({isOpen:a,onClose:r,title:t,size:O="medium",showCloseButton:C=!0,closeOnOverlayClick:j=!0,closeOnEscape:v=!0,children:M,footer:_})=>{if(d.useEffect(()=>{if(!a||!v)return;const i=I=>{I.key==="Escape"&&r()};return document.addEventListener("keydown",i),()=>document.removeEventListener("keydown",i)},[a,v,r]),d.useEffect(()=>(a?document.body.style.overflow="hidden":document.body.style.overflow="unset",()=>{document.body.style.overflow="unset"}),[a]),!a)return null;const k=i=>{j&&i.target===i.currentTarget&&r()},b=[o.modal,o[O]].filter(Boolean).join(" "),B=e.jsx("div",{className:o.overlay,onClick:k,children:e.jsxs("div",{className:b,role:"dialog","aria-modal":"true",children:[(t||C)&&e.jsxs("div",{className:o.header,children:[t&&e.jsx("h2",{className:o.title,children:t}),C&&e.jsx("button",{className:o.closeButton,onClick:r,"aria-label":"Close modal",children:e.jsxs("svg",{width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),e.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]})})]}),e.jsx("div",{className:o.content,children:M}),_&&e.jsx("div",{className:o.footer,children:_})]})});return S.createPortal(B,document.body)};try{l.displayName="Modal",l.__docgenInfo={description:"Modal component for displaying content in an overlay",displayName:"Modal",props:{isOpen:{defaultValue:null,description:"Whether the modal is open",name:"isOpen",required:!0,type:{name:"boolean"}},onClose:{defaultValue:null,description:"Function to call when the modal should be closed",name:"onClose",required:!0,type:{name:"() => void"}},title:{defaultValue:null,description:"The title of the modal",name:"title",required:!1,type:{name:"string | undefined"}},size:{defaultValue:{value:"medium"},description:"The size of the modal",name:"size",required:!1,type:{name:"enum",value:[{value:"undefined"},{value:'"small"'},{value:'"medium"'},{value:'"large"'},{value:'"extraLarge"'}]}},showCloseButton:{defaultValue:{value:"true"},description:"Whether to show the close button",name:"showCloseButton",required:!1,type:{name:"boolean | undefined"}},closeOnOverlayClick:{defaultValue:{value:"true"},description:"Whether clicking the overlay should close the modal",name:"closeOnOverlayClick",required:!1,type:{name:"boolean | undefined"}},closeOnEscape:{defaultValue:{value:"true"},description:"Whether pressing escape should close the modal",name:"closeOnEscape",required:!1,type:{name:"boolean | undefined"}},children:{defaultValue:null,description:"The content of the modal",name:"children",required:!0,type:{name:"ReactNode"}},footer:{defaultValue:null,description:"Footer content (typically buttons)",name:"footer",required:!1,type:{name:"ReactNode"}}}}}catch{}const U={title:"Components/Modal",component:l,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{size:{control:{type:"select"},options:["small","medium","large","extraLarge"]},showCloseButton:{control:{type:"boolean"}},closeOnOverlayClick:{control:{type:"boolean"}},closeOnEscape:{control:{type:"boolean"}}}},n=a=>{const[r,t]=d.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(s,{onClick:()=>t(!0),children:"Open Modal"}),e.jsx(l,{...a,isOpen:r,onClose:()=>t(!1),children:e.jsx("p",{children:"This is the modal content. You can put any content here."})})]})},c={render:n,args:{title:"Modal Title"}},u={render:a=>{const[r,t]=d.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(s,{onClick:()=>t(!0),children:"Open Modal"}),e.jsx(l,{...a,isOpen:r,onClose:()=>t(!1),footer:e.jsxs(e.Fragment,{children:[e.jsx(s,{variant:"secondary",onClick:()=>t(!1),children:"Cancel"}),e.jsx(s,{onClick:()=>t(!1),children:"Save"})]}),children:e.jsx("p",{children:"This modal has footer buttons."})})]})},args:{title:"Confirm Action"}},m={render:a=>{const[r,t]=d.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(s,{onClick:()=>t(!0),children:"Open Form Modal"}),e.jsx(l,{...a,isOpen:r,onClose:()=>t(!1),footer:e.jsxs(e.Fragment,{children:[e.jsx(s,{variant:"secondary",onClick:()=>t(!1),children:"Cancel"}),e.jsx(s,{onClick:()=>t(!1),children:"Submit"})]}),children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:[e.jsx(x,{label:"Name",placeholder:"Enter your name",required:!0}),e.jsx(x,{label:"Email",type:"email",placeholder:"Enter your email",required:!0}),e.jsx(x,{label:"Message",placeholder:"Enter your message",helperText:"Optional message"})]})})]})},args:{title:"Contact Form",size:"medium"}},p={render:n,args:{title:"Small Modal",size:"small"}},h={render:n,args:{title:"Large Modal",size:"large"}},f={render:n,args:{title:"Extra Large Modal",size:"extraLarge"}},g={render:n,args:{title:"No Close Button",showCloseButton:!1}},y={render:n,args:{title:"Click Overlay to Close Disabled",closeOnOverlayClick:!1}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: ModalTemplate,
  args: {
    title: 'Modal Title'
  }
}`,...c.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: (args: typeof Default.args) => {
    const [isOpen, setIsOpen] = useState(false);
    return <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} footer={<>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Save</Button>
            </>}>
          <p>This modal has footer buttons.</p>
        </Modal>
      </>;
  },
  args: {
    title: 'Confirm Action'
  }
}`,...u.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: (args: typeof Default.args) => {
    const [isOpen, setIsOpen] = useState(false);
    return <>
        <Button onClick={() => setIsOpen(true)}>Open Form Modal</Button>
        <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} footer={<>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Submit</Button>
            </>}>
          <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
            <Input label="Name" placeholder="Enter your name" required />
            <Input label="Email" type="email" placeholder="Enter your email" required />
            <Input label="Message" placeholder="Enter your message" helperText="Optional message" />
          </div>
        </Modal>
      </>;
  },
  args: {
    title: 'Contact Form',
    size: 'medium'
  }
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: ModalTemplate,
  args: {
    title: 'Small Modal',
    size: 'small'
  }
}`,...p.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: ModalTemplate,
  args: {
    title: 'Large Modal',
    size: 'large'
  }
}`,...h.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: ModalTemplate,
  args: {
    title: 'Extra Large Modal',
    size: 'extraLarge'
  }
}`,...f.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: ModalTemplate,
  args: {
    title: 'No Close Button',
    showCloseButton: false
  }
}`,...g.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: ModalTemplate,
  args: {
    title: 'Click Overlay to Close Disabled',
    closeOnOverlayClick: false
  }
}`,...y.parameters?.docs?.source}}};const X=["Default","WithFooter","FormModal","Small","Large","ExtraLarge","NoCloseButton","NoOverlayClose"];export{c as Default,f as ExtraLarge,m as FormModal,h as Large,g as NoCloseButton,y as NoOverlayClose,p as Small,u as WithFooter,X as __namedExportsOrder,U as default};
