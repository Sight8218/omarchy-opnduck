import QtQuick
import QtQuick.Controls
import Quickshell
import qs.Commons
import qs.Ui

Panel {
  id: root
  moduleName: "io.github.sight8218.opnduck"
  ipcTarget: "io.github.sight8218.opnduck"

  property var anchorItem: null
  property var hostWidget: null

  // Follows the Omarchy theme's accent.
  readonly property color brand: Color.accent
  readonly property color foreground: bar ? bar.foreground : Color.foreground
  readonly property string fontFamily: "JetBrains Mono"

  // Engine state lives in the shared service
  readonly property var svc: bar && bar.shell ? bar.shell.serviceFor("io.github.sight8218.opnduck") : null
  readonly property bool backendUp: svc ? svc.backendUp : false
  readonly property bool queuePaused: svc ? svc.queuePaused : false
  readonly property var jobs: svc ? svc.jobs : []
  readonly property string notice: svc ? svc.notice : ""
  readonly property int activeCount: svc ? svc.activeCount : 0
  readonly property int failedCount: svc ? svc.failedCount : 0
  property string tool: "download"

  readonly property var toolList: [
    { key: "download", label: "Download" },
    { key: "convert", label: "Convert" },
    { key: "compress", label: "Compress" },
    { key: "trim", label: "Trim" }
  ]

  function send(obj) { if (svc) svc.send(obj) }

  function startJob() {
    var a = {}
    if (tool === "download") {
      a = { url: urlField.text.trim(), format: dlFormat.value, videoQuality: dlQuality.value }
    } else if (tool === "convert") {
      a = { inputPath: pathField.text.trim(), container: convTo.value }
    } else if (tool === "compress") {
      a = { inputPath: pathField.text.trim(), targetMB: Number(mbField.text) || 0, quality: cmpQuality.value }
    } else if (tool === "trim") {
      var s = parseTime(startField.text), e = endField.text.trim() === "" ? null : parseTime(endField.text)
      a = { inputPath: pathField.text.trim(), start: s, end: e, mode: trimMode.value }
    }
    send({ cmd: "start", tool: tool, args: a })
  }
  // seconds, or m:ss / h:mm:ss
  function parseTime(t) {
    var parts = String(t).trim().split(":").map(Number)
    if (parts.length === 0 || parts.some(isNaN)) return 0
    return parts.reduce(function(acc, n) { return acc * 60 + n }, 0)
  }

  component Txt: Text {
    textFormat: Text.PlainText
    color: root.foreground
    font.family: root.fontFamily
    font.pixelSize: Style.font.body
    elide: Text.ElideRight
  }
  component Field: TextField {
    foreground: root.foreground
    accent: root.brand
    font.family: root.fontFamily
    Keys.onEscapePressed: root.close()
  }
  component Pick: Dropdown {
    showLabel: false
    rowHeight: col.fieldH
    foreground: root.foreground
    accent: root.brand
    fontFamily: root.fontFamily
  }
  component Label: Txt {
    font.pixelSize: Style.font.bodySmall
    font.letterSpacing: 1
    color: Color.muted
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root
    bar: root.bar
    open: root.opened
    contentWidth: panel.fittedContentWidth(Style.space(460))
    contentHeight: panel.fittedContentHeight(col.implicitHeight, Style.space(680))

    Flickable {
      id: flick
      anchors.fill: parent
      contentWidth: width
      contentHeight: col.implicitHeight
      clip: true
      boundsBehavior: Flickable.StopAtBounds
      interactive: contentHeight > height
      ScrollBar.vertical: ScrollBar { policy: ScrollBar.AsNeeded }

      Column {
        id: col
        width: flick.width - Style.space(6)   // keep clear of the scrollbar
        spacing: Style.space(10)
        readonly property real gap: Style.space(8)
        readonly property real half: (width - gap) / 2
        readonly property real fieldH: Style.space(34)

        // Header: duck + pixel wordmark
        Item {
          width: parent.width
          height: Math.max(duck.height, actions.height)
          DuckIcon { id: duck; iconSize: Style.space(30); color: root.brand; anchors.verticalCenter: parent.verticalCenter }
          PixelLogo {
            anchors.left: duck.right; anchors.leftMargin: Style.space(10)
            anchors.verticalCenter: parent.verticalCenter
            cell: Math.max(2, Style.space(3))
            accent: root.brand
            text: root.foreground
          }
          Row {
            id: actions
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.space(4)
            Button { text: root.queuePaused ? "Resume" : "Pause"; foreground: root.foreground; onClicked: root.send({ cmd: root.queuePaused ? "resume" : "pause" }) }
            Button { text: "Folder"; foreground: root.foreground; onClicked: root.send({ cmd: "folder" }) }
          }
        }

        Rectangle { width: parent.width; height: 1; color: Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.14) }

        Txt {
          visible: !root.backendUp
          width: parent.width
          wrapMode: Text.WordWrap
          elide: Text.ElideNone
          color: Color.urgent
          text: "The OPNduck engine isn't running (needs Node.js). Middle-click the bar icon to retry."
        }

        Row {
          width: parent.width
          spacing: col.gap
          Repeater {
            model: root.toolList
            delegate: Button {
              required property var modelData
              width: (col.width - 3 * col.gap) / 4
              height: col.fieldH
              text: modelData.label
              bordered: true
              selected: root.tool === modelData.key
              foreground: root.foreground
              accent: root.brand
              onClicked: root.tool = modelData.key
            }
          }
        }

        // Tool forms
        Column {
          width: parent.width
          spacing: Style.space(6)

          Column {
            visible: root.tool === "download"
            width: parent.width
            spacing: Style.space(6)
            Label { text: "LINK" }
            Field { id: urlField; width: parent.width; height: col.fieldH; placeholderText: "Paste a video or audio link"; onAccepted: root.startJob() }
            Row {
              spacing: col.gap
              Pick { id: dlFormat; height: col.fieldH; width: col.half; value: "MP4"; options: ["MP4", "MP3", "MKV", "MOV", "FLAC", "WAV"]; onChanged: function(v) { value = v } }
              Pick { id: dlQuality; height: col.fieldH; width: col.half; value: "best"; options: ["best", "2160", "1440", "1080", "720", "480", "360"]; onChanged: function(v) { value = v } }
            }
          }

          Column {
            visible: root.tool !== "download"
            width: parent.width
            spacing: Style.space(6)
            Label { text: "FILE" }
            Field { id: pathField; width: parent.width; height: col.fieldH; placeholderText: "Full path to a file (paste it)"; onAccepted: root.startJob() }

            Pick {
              visible: root.tool === "convert"
              id: convTo; width: parent.width; value: "MKV"
              options: ["MP4", "MKV", "WEBM", "MOV", "AVI", "GIF", "MP3", "FLAC", "WAV", "OGG", "M4A", "OPUS", "PNG", "JPG", "WEBP", "AVIF"]
              onChanged: function(v) { value = v }
            }
            Row {
              visible: root.tool === "compress"
              spacing: col.gap
              Field {
                id: mbField; width: col.half; height: col.fieldH; placeholderText: "Under … MB"; text: "10"
                validator: DoubleValidator { bottom: 0.5 }
                onAccepted: root.startJob()
              }
              Pick { id: cmpQuality; height: col.fieldH; width: col.half; value: "fast"; options: ["fast", "best"]; onChanged: function(v) { value = v } }
            }
            Row {
              visible: root.tool === "trim"
              spacing: col.gap
              readonly property real third: (col.width - 2 * col.gap) / 3
              Field { id: startField; width: parent.third; height: col.fieldH; placeholderText: "Start"; text: "0" }
              Field { id: endField; width: parent.third; height: col.fieldH; placeholderText: "End" }
              Pick { id: trimMode; height: col.fieldH; width: parent.third; value: "fast"; options: ["fast", "precise"]; onChanged: function(v) { value = v } }
            }
          }

          Button {
            width: parent.width
            height: col.fieldH
            text: "Start"
            background: root.brand
            foreground: Color.background
            accent: root.brand
            onClicked: root.startJob()
          }
        }

        Txt {
          visible: root.notice !== ""
          width: parent.width
          wrapMode: Text.WordWrap
          elide: Text.ElideNone
          color: Color.urgent
          text: root.notice
        }

        // Queue
        Row {
          width: parent.width
          visible: root.jobs.length > 0
          Label { width: parent.width - clearBtn.width; text: "QUEUE"; anchors.verticalCenter: parent.verticalCenter }
          Button { id: clearBtn; text: "Clear finished"; foreground: root.foreground; onClicked: root.send({ cmd: "clear" }) }
        }

        Repeater {
          model: root.jobs.slice(0, 10)
          delegate: Item {
            required property var modelData
            width: col.width
            height: rowCol.implicitHeight + Style.space(4)

            Column {
              id: rowCol
              anchors.left: parent.left
              anchors.right: btns.left
              anchors.rightMargin: Style.space(6)
              spacing: Style.space(3)
              Txt { width: parent.width; text: modelData.label !== "" ? modelData.label : modelData.kind }
              Rectangle {
                width: parent.width; height: Style.space(4); radius: 0
                color: Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.15)
                Rectangle {
                  height: parent.height; radius: 0
                  width: parent.width * (modelData.status === "done" ? 1 : modelData.progress)
                  color: modelData.status === "error" ? Color.urgent : root.brand
                }
              }
              Txt {
                width: parent.width
                font.pixelSize: Style.font.bodySmall
                color: modelData.status === "error" ? Color.urgent : Color.muted
                text: modelData.status === "error" && modelData.error !== "" ? modelData.error
                  : modelData.kind + " · " + modelData.status + (modelData.status === "running" ? " · " + Math.round(modelData.progress * 100) + "%" : "")
              }
            }
            Row {
              id: btns
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              spacing: Style.space(4)
              Button { visible: modelData.status === "done"; text: "Show"; foreground: root.foreground; onClicked: root.send({ cmd: "reveal", id: modelData.id }) }
              Button { visible: modelData.status === "running" || modelData.status === "queued"; text: "Cancel"; foreground: root.foreground; onClicked: root.send({ cmd: "cancel", id: modelData.id }) }
            }
          }
        }
      }
    }
  }
}
