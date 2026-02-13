<script lang="ts">
  import { browser } from "$app/environment";
  import React from "react";
  import Excalidraw from "svelte-excalidraw";

  function buildMainMenu(mod: typeof import("@excalidraw/excalidraw")) {
    const { MainMenu } = mod;
    const Def = MainMenu.DefaultItems;
    return React.createElement(MainMenu, { key: "main-menu" }, [
      React.createElement(
        MainMenu.Group,
        {
          key: "group-defaults",
          title: "Excalidraw items",
        },
        [
          React.createElement(Def.LoadScene, { key: "loadScene" }),
          React.createElement(Def.SaveToActiveFile, {
            key: "saveToActiveFile",
          }),
          React.createElement(Def.SaveAsImage, { key: "saveAsImage" }),
          React.createElement(Def.CommandPalette, { key: "commandPalette" }),
          React.createElement(Def.SearchMenu, { key: "searchMenu" }),
          React.createElement(Def.Help, { key: "help" }),
          React.createElement(Def.ClearCanvas, { key: "clearCanvas" }),
          React.createElement(Def.ToggleTheme, { key: "toggleTheme" }),
          React.createElement(Def.ChangeCanvasBackground, {
            key: "changeCanvasBackground",
          }),
          React.createElement(Def.Export, { key: "export" }),
          React.createElement(Def.LiveCollaborationTrigger, {
            key: "liveCollab",
            onSelect: () => window.alert("Live collaboration"),
            isCollaborating: false,
          }),
          React.createElement(Def.PreferencesToggleGridModeItem, {
            key: "gridMode",
          }),
          React.createElement(Def.PreferencesToggleZenModeItem, {
            key: "zenMode",
          }),
          React.createElement(Def.Preferences, { key: "preferences" }),
        ],
      ),
      React.createElement(
        MainMenu.Group,
        { key: "group-links", title: "Links" },
        [
          React.createElement(
            MainMenu.ItemLink,
            { key: "google", href: "https://google.com" },
            "Google",
          ),
          React.createElement(
            MainMenu.ItemLink,
            { key: "excalidraw", href: "https://excalidraw.com" },
            "Excalidraw",
          ),
        ],
      ),
      React.createElement(
        MainMenu.Group,
        { key: "group-custom", title: "Custom items" },
        [
          React.createElement(
            MainMenu.Item,
            { key: "item1", onSelect: () => window.alert("Item1") },
            "Item1",
          ),
          React.createElement(
            MainMenu.Item,
            { key: "item2", onSelect: () => window.alert("Item 2") },
            "Item 2",
          ),
        ],
      ),
      React.createElement(
        MainMenu.ItemCustom,
        { key: "itemCustom" },
        React.createElement(
          "button",
          {
            style: { height: "2rem" },
            onClick: () => window.alert("custom menu item"),
          },
          "custom item",
        ),
      ),
    ]);
  }

  function buildWelcomeScreen(mod: typeof import("@excalidraw/excalidraw")) {
    return React.createElement(mod.WelcomeScreen, { key: "welcome-screen" });
  }

  function buildSidebar(mod: typeof import("@excalidraw/excalidraw")) {
    const { Sidebar } = mod;
    return React.createElement(
      Sidebar,
      {
        key: "sidebar",
        name: "custom",
        docked: false,
      },
      [
        React.createElement(Sidebar.Header, { key: "header" }),
        React.createElement(
          Sidebar.Tabs,
          { key: "tabs", style: { padding: "0.5rem" } },
          [
            React.createElement(
              Sidebar.Tab,
              { key: "tab-one", tab: "one" },
              "Tab one",
            ),
            React.createElement(
              Sidebar.Tab,
              { key: "tab-two", tab: "two" },
              "Tab two",
            ),
            React.createElement(Sidebar.TabTriggers, { key: "triggers" }, [
              React.createElement(
                Sidebar.TabTrigger,
                { key: "t1", tab: "one" },
                "One",
              ),
              React.createElement(
                Sidebar.TabTrigger,
                { key: "t2", tab: "two" },
                "Two",
              ),
            ]),
          ],
        ),
      ],
    );
  }

  function buildFooter(mod: typeof import("@excalidraw/excalidraw")) {
    const { Footer, Sidebar } = mod;
    return React.createElement(
      Footer,
      { key: "footer" },
      React.createElement(
        Sidebar.Trigger,
        {
          name: "custom",
          tab: "one",
          style: {
            marginLeft: "0.5rem",
            background: "#70b1ec",
            color: "white",
          },
        },
        "Open custom sidebar",
      ),
    );
  }

  function buildChildren(mod: typeof import("@excalidraw/excalidraw")) {
    return React.createElement(React.Fragment, null, [
      buildMainMenu(mod),
      buildWelcomeScreen(mod),
      buildSidebar(mod),
      buildFooter(mod),
    ]);
  }
</script>

<svelte:head>
  <title>Excalidraw - Children (MainMenu, WelcomeScreen, Sidebar, Footer)</title
  >
</svelte:head>

{#if browser}
  <Excalidraw
    childrenBuilder={buildChildren}
    UIOptions={{ dockedSidebarBreakpoint: 0 }}
    autoFocus={true}
  />
{/if}
