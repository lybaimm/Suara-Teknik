<?php
declare(strict_types=1);

const FORUM_AGENDA = 'Forum Advokasi';

function getAgenda(PDO $db, bool $admin): array
{
    // Published history is needed for the full monthly calendar; drafts stay private.
    $condition = "status IN ('published', 'cancelled')";
    $filter = $admin ? '' : "AND $condition";
    $rows = runQuery($db, "
        SELECT id, title, type, event_date, start_time, end_time,
               building, room, topics, status, ($condition) AS is_public
        FROM events
        WHERE type = ? $filter
        ORDER BY event_date, start_time, id
    ", [FORUM_AGENDA])->fetchAll();

    return array_map(static fn(array $row): array => [
        'id' => (int) $row['id'],
        'title' => $row['title'],
        'type' => $row['type'],
        'eventDate' => $row['event_date'],
        'dateLabel' => reportDate($row['event_date']),
        'startTime' => substr($row['start_time'], 0, 5),
        'endTime' => substr($row['end_time'] ?? '', 0, 5),
        'building' => $row['building'],
        'room' => $row['room'],
        'topics' => $row['topics'],
        'status' => $row['status'],
        'isPublic' => (bool) $row['is_public'],
    ], $rows);
}

function manageAgenda(PDO $db, array $user, array $input, string $action): void
{
    $id = null;
    if ($action !== 'event-create') {
        $id = positiveId($input['id'] ?? null);
        if (!runQuery($db, '
            SELECT id FROM events WHERE id = ? AND type = ? FOR UPDATE
        ', [$id, FORUM_AGENDA])->fetchColumn()) {
            fail(404, 'Agenda tidak ditemukan.');
        }
    }

    if ($action === 'event-delete') {
        runQuery($db, 'DELETE FROM events WHERE id = ?', [$id]);
        return;
    }

    if (array_key_exists('type', $input) && $input['type'] !== FORUM_AGENDA) {
        fail(422, 'Agenda hanya tersedia untuk Forum Advokasi.');
    }
    $status = field($input, 'status', 12);
    $date = field($input, 'eventDate', 10);
    $start = field($input, 'startTime', 5);
    $end = field($input, 'endTime', 5, false);

    if (!in_array($status, ['draft', 'published', 'cancelled'], true)) {
        fail(422, 'Status agenda tidak valid.');
    }

    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    if (!$parsed || (int) $parsed->format('Y') < 1000 || $parsed->format('Y-m-d') !== $date) {
        fail(422, 'Tanggal agenda tidak valid.');
    }
    $clock = '/^(?:[01]\d|2[0-3]):[0-5]\d$/D';
    if (!preg_match($clock, $start) || ($end !== '' &&
        (!preg_match($clock, $end) || $end <= $start))) {
        fail(422, 'Jam selesai harus setelah jam mulai pada hari yang sama.');
    }

    $values = [
        field($input, 'title', 150), $date, $start, $end ?: null,
        field($input, 'building', 150), field($input, 'room', 100),
        field($input, 'topics', 2000), $status,
    ];

    if ($id === null) {
        runQuery($db, '
            INSERT INTO events (title, event_date, start_time, end_time, building,
                                room, topics, status, type, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ', [...$values, FORUM_AGENDA, $user['id']]);
        return;
    }

    runQuery($db, '
        UPDATE events SET title = ?, event_date = ?, start_time = ?,
            end_time = ?, building = ?, room = ?, topics = ?, status = ?
        WHERE id = ?
    ', [...$values, $id]);
}
