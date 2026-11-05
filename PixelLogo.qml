import QtQuick
import qs.Commons

// The OPNduck wordmark in 5x7 pixel letters, as in the app (banded light -> accent).
Item {
  id: root
  property real cell: 3
  property color accent: Color.accent
  property color text: Color.foreground

  readonly property var glyphs: ({
    O: ["01110","10001","10001","10001","10001","10001","01110"],
    P: ["11110","10001","10001","11110","10000","10000","10000"],
    N: ["10001","11001","10101","10101","10011","10001","10001"],
    D: ["11110","10001","10001","10001","10001","10001","11110"],
    U: ["10001","10001","10001","10001","10001","10001","01110"],
    C: ["01110","10001","10000","10000","10000","10001","01110"],
    K: ["10001","10010","10100","11000","10100","10010","10001"]
  })
  readonly property var bands: [78, 62, 50, 40, 30, 22, 14]
  readonly property var cells: {
    var out = [], x = 0
    var word = "OPNDUCK"
    for (var i = 0; i < word.length; i++) {
      var g = glyphs[word[i]]
      for (var r = 0; r < 7; r++)
        for (var c = 0; c < 5; c++)
          if (g[r][c] === "1") out.push({ x: x + c, y: r })
      x += 6
    }
    return out
  }
  width: 41 * cell
  height: 7 * cell

  Repeater {
    model: root.cells
    delegate: Rectangle {
      required property var modelData
      x: modelData.x * root.cell
      y: modelData.y * root.cell
      width: root.cell
      height: root.cell
      antialiasing: false
      color: Qt.tint(root.accent, Qt.rgba(root.text.r, root.text.g, root.text.b, root.bands[modelData.y] / 100))
    }
  }
}
