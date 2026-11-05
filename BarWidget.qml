import QtQuick
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "io.github.sight8218.opnduck"

  function injectPanel() {
    var t = panelLoader.item
    if (!t) return
    if ("bar" in t) t.bar = root.bar
    if ("settings" in t) t.settings = root.settings
    if ("anchorItem" in t) t.anchorItem = button
    if ("hostWidget" in t) t.hostWidget = root
  }

  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false
  readonly property bool popoutSwitchClosing: panelLoader.item ? panelLoader.item.popoutSwitchClosing === true : false
  function open() { if (panelLoader.item) panelLoader.item.open() }
  function close() { if (panelLoader.item) panelLoader.item.close() }
  function togglePanel() { if (panelLoader.item) panelLoader.item.toggle() }
  function closeForPopoutSwitch() { if (panelLoader.item) panelLoader.item.closeForPopoutSwitch() }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight
  onBarChanged: injectPanel()
  onSettingsChanged: injectPanel()

  Loader {
    id: panelLoader
    active: true
    visible: false
    source: Qt.resolvedUrl("Panel.qml")
    onLoaded: { root.injectPanel(); Qt.callLater(root.injectPanel) }
  }

  readonly property var p: panelLoader.item
  readonly property color tint: !root.p ? Color.foreground
    : root.p.failedCount > 0 ? (root.bar ? root.bar.urgent : Color.urgent)
    : root.p.activeCount > 0 ? Color.accent
    : (root.bar ? root.bar.barForeground : Color.foreground)

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    labelText: root.p && root.p.activeCount > 0 ? String(root.p.activeCount) : ""
    slotSize: Style.bar.statusSlot
    iconComponent: Component {
      DuckIcon {
        iconSize: Style.bar.iconSize
        color: root.tint
      }
    }
    tooltipText: !root.p ? "OPNduck"
      : root.p.backendUp ? "OPNduck: " + root.p.activeCount + " active"
      : "OPNduck: engine not running"
    onPressed: function(b) {
      if (!root.bar) return
      if (b === Qt.MiddleButton) { if (root.p && root.p.svc) root.p.svc.startBackend() }
      else root.togglePanel()
    }
  }
}
