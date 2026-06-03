import json
import os

FILE = "todos.json"


def load():
    if os.path.exists(FILE):
        with open(FILE, encoding="utf-8") as f:
            return json.load(f)
    return []


def save(todos):
    with open(FILE, "w", encoding="utf-8") as f:
        json.dump(todos, f, ensure_ascii=False, indent=2)


def show(todos):
    if not todos:
        print("タスクはありません。")
        return
    for i, t in enumerate(todos, 1):
        status = "✓" if t["done"] else " "
        print(f"  {i}. [{status}] {t['text']}")


def main():
    todos = load()
    while True:
        print("\n--- ToDoリスト ---")
        show(todos)
        print("\n1: 追加  2: 完了  3: 削除  4: 終了")
        choice = input("選択: ").strip()

        if choice == "1":
            text = input("タスク名: ").strip()
            if text:
                todos.append({"text": text, "done": False})
                save(todos)
        elif choice == "2":
            num = input("完了にする番号: ").strip()
            if num.isdigit() and 1 <= int(num) <= len(todos):
                todos[int(num) - 1]["done"] = True
                save(todos)
        elif choice == "3":
            num = input("削除する番号: ").strip()
            if num.isdigit() and 1 <= int(num) <= len(todos):
                removed = todos.pop(int(num) - 1)
                print(f"「{removed['text']}」を削除しました。")
                save(todos)
        elif choice == "4":
            print("終了します。")
            break


if __name__ == "__main__":
    main()
