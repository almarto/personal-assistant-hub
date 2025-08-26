import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{C as t}from"./Card-DdCIGXUg.js";import{G as u}from"./Grid-CwYSw3zt.js";import"./iframe-Cpc-BwD0.js";import"./preload-helper-D9Z9MdNV.js";const v={title:"Components/Grid",component:u,parameters:{layout:"padded"},tags:["autodocs"],argTypes:{columns:{control:{type:"select"},options:[1,2,3,4,"auto-fit"]},gap:{control:{type:"select"},options:["small","medium","large"]},minColumnWidth:{control:{type:"text"}}}},r=({children:h,...p})=>e.jsx(t,{...p,children:e.jsx("div",{style:{padding:"1rem",textAlign:"center"},children:h})}),n={args:{children:e.jsxs(e.Fragment,{children:[e.jsx(r,{children:"Item 1"}),e.jsx(r,{children:"Item 2"}),e.jsx(r,{children:"Item 3"}),e.jsx(r,{children:"Item 4"}),e.jsx(r,{children:"Item 5"}),e.jsx(r,{children:"Item 6"})]})}},i={args:{columns:2,children:e.jsxs(e.Fragment,{children:[e.jsx(r,{children:"Column 1"}),e.jsx(r,{children:"Column 2"}),e.jsx(r,{children:"Column 1"}),e.jsx(r,{children:"Column 2"})]})}},a={args:{columns:3,children:e.jsxs(e.Fragment,{children:[e.jsx(r,{children:"Item 1"}),e.jsx(r,{children:"Item 2"}),e.jsx(r,{children:"Item 3"}),e.jsx(r,{children:"Item 4"}),e.jsx(r,{children:"Item 5"}),e.jsx(r,{children:"Item 6"})]})}},s={args:{columns:4,children:e.jsxs(e.Fragment,{children:[e.jsx(r,{children:"1"}),e.jsx(r,{children:"2"}),e.jsx(r,{children:"3"}),e.jsx(r,{children:"4"}),e.jsx(r,{children:"5"}),e.jsx(r,{children:"6"}),e.jsx(r,{children:"7"}),e.jsx(r,{children:"8"})]})}},d={args:{gap:"small",columns:3,children:e.jsxs(e.Fragment,{children:[e.jsx(r,{children:"Small Gap 1"}),e.jsx(r,{children:"Small Gap 2"}),e.jsx(r,{children:"Small Gap 3"}),e.jsx(r,{children:"Small Gap 4"}),e.jsx(r,{children:"Small Gap 5"}),e.jsx(r,{children:"Small Gap 6"})]})}},m={args:{gap:"large",columns:2,children:e.jsxs(e.Fragment,{children:[e.jsx(r,{children:"Large Gap 1"}),e.jsx(r,{children:"Large Gap 2"}),e.jsx(r,{children:"Large Gap 3"}),e.jsx(r,{children:"Large Gap 4"})]})}},l={args:{columns:"auto-fit",minColumnWidth:"200px",children:e.jsxs(e.Fragment,{children:[e.jsx(r,{children:"Auto-fit 1"}),e.jsx(r,{children:"Auto-fit 2"}),e.jsx(r,{children:"Auto-fit 3"}),e.jsx(r,{children:"Auto-fit 4"}),e.jsx(r,{children:"Auto-fit 5"})]})}},o={args:{columns:"auto-fit",minColumnWidth:"250px",gap:"medium",children:e.jsxs(e.Fragment,{children:[e.jsx(t,{variant:"interactive",hoverable:!0,children:e.jsxs("div",{style:{padding:"1.5rem"},children:[e.jsx("h3",{children:"Feature Card 1"}),e.jsx("p",{children:"This is a responsive card that adapts to screen size."})]})}),e.jsx(t,{variant:"interactive",hoverable:!0,children:e.jsxs("div",{style:{padding:"1.5rem"},children:[e.jsx("h3",{children:"Feature Card 2"}),e.jsx("p",{children:"Resize the viewport to see how the grid adapts."})]})}),e.jsx(t,{variant:"interactive",hoverable:!0,children:e.jsxs("div",{style:{padding:"1.5rem"},children:[e.jsx("h3",{children:"Feature Card 3"}),e.jsx("p",{children:"The minimum column width ensures readability."})]})}),e.jsx(t,{variant:"interactive",hoverable:!0,children:e.jsxs("div",{style:{padding:"1.5rem"},children:[e.jsx("h3",{children:"Feature Card 4"}),e.jsx("p",{children:"Perfect for dashboard layouts and content grids."})]})})]})}},c={args:{columns:1,children:e.jsxs(e.Fragment,{children:[e.jsxs(r,{children:[e.jsx("h3",{children:"Single Column Layout"}),e.jsx("p",{children:"All items stack vertically in a single column."})]}),e.jsxs(r,{children:[e.jsx("h3",{children:"Second Item"}),e.jsx("p",{children:"Useful for mobile layouts or narrow containers."})]}),e.jsxs(r,{children:[e.jsx("h3",{children:"Third Item"}),e.jsx("p",{children:"Each item takes the full width available."})]})]})}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    children: <>
        <GridItem>Item 1</GridItem>
        <GridItem>Item 2</GridItem>
        <GridItem>Item 3</GridItem>
        <GridItem>Item 4</GridItem>
        <GridItem>Item 5</GridItem>
        <GridItem>Item 6</GridItem>
      </>
  }
}`,...n.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    columns: 2,
    children: <>
        <GridItem>Column 1</GridItem>
        <GridItem>Column 2</GridItem>
        <GridItem>Column 1</GridItem>
        <GridItem>Column 2</GridItem>
      </>
  }
}`,...i.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    columns: 3,
    children: <>
        <GridItem>Item 1</GridItem>
        <GridItem>Item 2</GridItem>
        <GridItem>Item 3</GridItem>
        <GridItem>Item 4</GridItem>
        <GridItem>Item 5</GridItem>
        <GridItem>Item 6</GridItem>
      </>
  }
}`,...a.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    columns: 4,
    children: <>
        <GridItem>1</GridItem>
        <GridItem>2</GridItem>
        <GridItem>3</GridItem>
        <GridItem>4</GridItem>
        <GridItem>5</GridItem>
        <GridItem>6</GridItem>
        <GridItem>7</GridItem>
        <GridItem>8</GridItem>
      </>
  }
}`,...s.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    gap: 'small',
    columns: 3,
    children: <>
        <GridItem>Small Gap 1</GridItem>
        <GridItem>Small Gap 2</GridItem>
        <GridItem>Small Gap 3</GridItem>
        <GridItem>Small Gap 4</GridItem>
        <GridItem>Small Gap 5</GridItem>
        <GridItem>Small Gap 6</GridItem>
      </>
  }
}`,...d.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    gap: 'large',
    columns: 2,
    children: <>
        <GridItem>Large Gap 1</GridItem>
        <GridItem>Large Gap 2</GridItem>
        <GridItem>Large Gap 3</GridItem>
        <GridItem>Large Gap 4</GridItem>
      </>
  }
}`,...m.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    columns: 'auto-fit',
    minColumnWidth: '200px',
    children: <>
        <GridItem>Auto-fit 1</GridItem>
        <GridItem>Auto-fit 2</GridItem>
        <GridItem>Auto-fit 3</GridItem>
        <GridItem>Auto-fit 4</GridItem>
        <GridItem>Auto-fit 5</GridItem>
      </>
  }
}`,...l.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    columns: 'auto-fit',
    minColumnWidth: '250px',
    gap: 'medium',
    children: <>
        <Card variant="interactive" hoverable>
          <div style={{
          padding: '1.5rem'
        }}>
            <h3>Feature Card 1</h3>
            <p>This is a responsive card that adapts to screen size.</p>
          </div>
        </Card>
        <Card variant="interactive" hoverable>
          <div style={{
          padding: '1.5rem'
        }}>
            <h3>Feature Card 2</h3>
            <p>Resize the viewport to see how the grid adapts.</p>
          </div>
        </Card>
        <Card variant="interactive" hoverable>
          <div style={{
          padding: '1.5rem'
        }}>
            <h3>Feature Card 3</h3>
            <p>The minimum column width ensures readability.</p>
          </div>
        </Card>
        <Card variant="interactive" hoverable>
          <div style={{
          padding: '1.5rem'
        }}>
            <h3>Feature Card 4</h3>
            <p>Perfect for dashboard layouts and content grids.</p>
          </div>
        </Card>
      </>
  }
}`,...o.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    columns: 1,
    children: <>
        <GridItem>
          <h3>Single Column Layout</h3>
          <p>All items stack vertically in a single column.</p>
        </GridItem>
        <GridItem>
          <h3>Second Item</h3>
          <p>Useful for mobile layouts or narrow containers.</p>
        </GridItem>
        <GridItem>
          <h3>Third Item</h3>
          <p>Each item takes the full width available.</p>
        </GridItem>
      </>
  }
}`,...c.parameters?.docs?.source}}};const C=["Default","TwoColumns","ThreeColumns","FourColumns","SmallGap","LargeGap","AutoFitCustomWidth","ResponsiveCards","SingleColumn"];export{l as AutoFitCustomWidth,n as Default,s as FourColumns,m as LargeGap,o as ResponsiveCards,c as SingleColumn,d as SmallGap,a as ThreeColumns,i as TwoColumns,C as __namedExportsOrder,v as default};
